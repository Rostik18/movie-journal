import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { UserWatchingService } from '../../services/user-watching.service';
import { ToastService } from '../../services/toast.service';
import { UserWatchingItem, UserWatchingResponseSlim, UserWatchingSidebar } from '../../models/user-watching.model';
import { MediaItem } from '../../models/media.model';
import { MediaType, MediaTypeLabels, Visibility, WatchStatus, WatchStatusLabels } from '../../models/enums';
import { SortDirection, UserWatchingSearchParams, UserWatchingSortField } from '../../models/search.model';
import { formatDuration, formatTimecode } from '../../utils/media-format.util';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { UserWatchingFormComponent } from '../shared/user-watching-form/user-watching-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SearchToolbarComponent, SortFieldOption, ToolbarFilter, enumOptions } from '../shared/search-toolbar/search-toolbar.component';
import { DatePipe } from '@angular/common';
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';

@Component({
    selector: 'app-user-watching-list',
    standalone: true,
    imports: [
        RouterLink,
        ViewSwitcherComponent,
        AddButtonComponent,
        UserWatchingFormComponent,
        RatingStarsComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        PaginationComponent,
        SearchToolbarComponent,
        DatePipe
    ],
    templateUrl: './user-watching-list.component.html',
    styleUrls: ['./user-watching-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserWatchingListComponent implements OnInit {
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<UserWatchingResponseSlim, UserWatchingSearchParams>({
        search: params => this.userWatchingService.searchUserWatchingList(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Descending },
        filterKeys: ['status', 'type', 'hasRating', 'hasNotes', 'visibility'],
        // 0 — валідне значення enum, тому порівнюємо з undefined, а не на truthy
        isFiltered: p => !!p.query
            || p.status !== undefined
            || p.type !== undefined
            || p.hasRating !== undefined
            || p.hasNotes !== undefined
            || p.visibility !== undefined,
        errorMessage: 'Не вдалося завантажити список перегляду.'
    });
    readonly watchingList = this.list.items;

    // ---------- Модалка додавання / редагування ----------
    private readonly watchingForm = viewChild(UserWatchingFormComponent);
    readonly modal = createFormModal<UserWatchingSidebar>(this.watchingForm);

    // ---------- Сайдбар деталей (/watchlist/:mediaId) ----------
    readonly details = createDetailsRoute<UserWatchingResponseSlim, UserWatchingSidebar>({
        basePath: '/watchlist',
        fetch: mediaId => this.userWatchingService.getSidebarByMediaId(mediaId),
        errorMessage: 'Не вдалося завантажити деталі.',
        summary: {
            find: mediaId => this.watchingList().find(i => i.media?.id === mediaId) ?? null,
            fromDetail: item => ({
                media: item.media,
                status: item.status,
                rating: item.rating,
                notes: item.notes
            })
        }
    });
    /** Скорочений запис зі списку: доступний одразу, дає заголовок і постер, поки вантажаться деталі. */
    readonly selectedSlim = this.details.summary;
    /** Повний запис із GET /api/user-watching/media/{id}/sidebar: усе, що потрібно сайдбару. */
    readonly selectedItem = this.details.detail;

    private readonly deleteCallbacks = createDeleteCallbacks((mediaId: string) => this.userWatchingService.deleteUserWatching(mediaId));

    readonly selectedDeleteCallback = computed(() => {
        const item = this.selectedSlim();
        return item ? this.deleteCallbacks.get(item.media.id) : undefined;
    });

    readonly watchStatusLabels = WatchStatusLabels;
    readonly mediaTypeLabels = MediaTypeLabels;

    // Робимо Enum доступним у шаблоні
    readonly SortDirection = SortDirection;

    // ---------- Панель пошуку ----------
    private readonly statusOptions = enumOptions(WatchStatus, WatchStatusLabels);
    private readonly typeOptions = enumOptions(MediaType, MediaTypeLabels);

    private readonly hasRatingOptions = [
        { value: true, label: 'З оцінкою' },
        { value: false, label: 'Без оцінки' }
    ];

    private readonly hasNotesOptions = [
        { value: true, label: 'З нотатками' },
        { value: false, label: 'Без нотаток' }
    ];

    private readonly visibilityOptions = enumOptions(Visibility,
        { [Visibility.Public]: 'Публічні', [Visibility.Private]: 'Приватні' },
        { [Visibility.Public]: 'globe', [Visibility.Private]: 'lock' }
    );

    readonly watchingSortFields: SortFieldOption[] = enumOptions(UserWatchingSortField, {
        [UserWatchingSortField.Title]: 'Назвою',
        [UserWatchingSortField.Status]: 'Статусом',
        [UserWatchingSortField.Rating]: 'Оцінкою',
        [UserWatchingSortField.StartedAt]: 'Датою початку',
        [UserWatchingSortField.FinishedAt]: 'Датою завершення',
        [UserWatchingSortField.CreatedAt]: 'Датою додавання',
        [UserWatchingSortField.UpdatedAt]: 'Датою оновлення'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.list.searchParams();
        return [
            { key: 'status', label: 'Статус', value: params.status, options: this.statusOptions },
            { key: 'type', label: 'Тип', value: params.type, options: this.typeOptions },
            { key: 'hasRating', label: 'Оцінка', value: params.hasRating, options: this.hasRatingOptions },
            { key: 'hasNotes', label: 'Нотатки', value: params.hasNotes, options: this.hasNotesOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    // Форматування, спільне зі списком фільмів (utils/media-format.util.ts)
    readonly formatDuration = formatDuration;
    readonly formatTimecode = formatTimecode;

    ngOnInit(): void {
        this.details.watchRoute();
        this.list.load();
    }

    // ====================== Відображення полів ======================
    /** Бейдж оцінки на постері: «★ 7». Для null бейджа немає. */
    ratingBadge(rating: number | null | undefined): string | null {
        return rating == null ? null : `★ ${rating}`;
    }

    typeLabel(type: MediaItem['type'] | null | undefined): string {
        return type == null ? '—' : (this.mediaTypeLabels[type] ?? String(type));
    }

    /** «Сезон 2 / Серія 5»; якщо задано лише одне з чисел, зайвого роздільника немає. */
    progressLabel(item: UserWatchingSidebar): string {
        const parts: string[] = [];
        if (item.currentSeasonNumber) {
            parts.push(`Сезон ${item.currentSeasonNumber}`);
        }
        if (item.currentEpisodeNumber) {
            parts.push(`Серія ${item.currentEpisodeNumber}`);
        }
        return parts.join(' / ');
    }

    onEditItem(): void {
        const item = this.selectedItem();
        if (!item) {
            this.toastService.show('Деталі ще завантажуються.', 'info', 3000);
            return;
        }
        this.modal.openEdit(item);
    }

    // ====================== Рейтинг ======================
    /** Оптимістичне оновлення: одразу показуємо нову оцінку, при помилці відкочуємо. */
    updateRating(item: UserWatchingResponseSlim, newRating: number): void {
        const mediaId = item.media?.id;
        if (!mediaId) {
            return;
        }

        const previous = { rating: item.rating, status: item.status };
        // Оцінка переводить запис у «Переглянуто», тому оновлюємо й статус, щоб бейдж у таблиці не застарів
        this.patchItem(mediaId, { rating: newRating, status: WatchStatus.Watched });

        this.userWatchingService.updateWatchlist({ mediaId, rating: newRating, status: WatchStatus.Watched }).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => this.toastService.show(`Рейтинг оновлено: ${newRating}/10 ⭐`, 'success', 2500),
            error: err => {
                console.error('Помилка оновлення рейтингу:', err);
                this.patchItem(mediaId, previous);
                this.toastService.show('Не вдалося оновити рейтинг.', 'error', 4000);
            }
        });
    }

    /** Оновлює запис і у списку, і (якщо відкритий) у повних деталях сайдбару. */
    private patchItem(mediaId: string, patch: Partial<UserWatchingResponseSlim>): void {
        this.watchingList.update(list =>
            list.map(i => (i.media?.id === mediaId ? { ...i, ...patch } : i))
        );

        if (this.selectedSlim()?.media?.id === mediaId) {
            this.selectedSlim.update(s => (s ? { ...s, ...patch } : s));
        }
        if (this.selectedItem()?.media?.id === mediaId) {
            this.selectedItem.update(i => (i ? { ...i, ...(patch as Partial<UserWatchingSidebar>) } : i));
        }
    }

    // ====================== Видалення ======================
    onSidebarItemDeleted(): void {
        const item = this.selectedSlim();
        if (!item) {
            return;
        }

        const mediaId = item.media.id;
        this.deleteCallbacks.forget(mediaId);
        this.list.removeItems(i => i.media?.id === mediaId);
        this.toastService.show('Успішно видалено зі списку перегляду', 'success', 3000);
        this.details.close();
    }

    // ====================== Форма ======================
    onWatchingUpdated(updated: UserWatchingItem): void {
        this.modal.close();

        const mediaId = updated.media?.id ?? this.selectedSlim()?.media?.id;
        if (!mediaId) {
            this.list.load();
            return;
        }

        this.patchItem(mediaId, { status: updated.status, rating: updated.rating, notes: updated.notes });
    }

    onWatchingCreated(): void {
        this.modal.close();
        this.list.load();
    }

    copyToClipboard(url: string): void {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.show('Посилання скопійовано в буфер обміну! 📋', 'success', 2500);
        }).catch(err => {
            console.error('Не вдалося скопіювати посилання:', err);
            this.toastService.show('Помилка копіювання посилання.', 'error', 3000);
        });
    }
}