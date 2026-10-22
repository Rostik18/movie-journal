import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { UserWatchingService } from '../../services/user-watching.service';
import { ToastService } from '../../services/toast.service';
import { UserWatchingItem } from '../../models/user-watching.model';
import { MediaItem } from '../../models/media.model';
import { MediaType, MediaTypeLabels, Visibility, WatchStatus, WatchStatusLabels } from '../../models/enums';
import { PageResponse } from '../../models/shared.model';
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

type DeleteCallback = () => ReturnType<UserWatchingService['deleteUserWatching']>;

/** Ключі UserWatchingSearchParams, якими керують кнопки-фільтри тулбара. */
const FILTER_KEYS = ['status', 'type', 'hasRating', 'hasNotes', 'visibility'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULT_PAGE_SIZE = 20;

@Component({
    selector: 'app-user-watching-list',
    standalone: true,
    imports: [
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
    styleUrls: ['./user-watching-list.component.scss']
})
export class UserWatchingListComponent implements OnInit {
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly watchingList = signal<UserWatchingItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);

    // Стан сайдбару деталей
    readonly selectedItem = signal<UserWatchingItem | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly watchStatusLabels = WatchStatusLabels;
    readonly mediaTypeLabels = MediaTypeLabels;

    // Робимо Enum доступним у шаблоні
    readonly SortDirection = SortDirection;

    readonly searchParams = signal<UserWatchingSearchParams>({
        offset: 0,
        size: DEFAULT_PAGE_SIZE,
        sort: SortDirection.Descending
    });

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
        const params = this.searchParams();
        return [
            { key: 'status', label: 'Статус', value: params.status, options: this.statusOptions },
            { key: 'type', label: 'Тип', value: params.type, options: this.typeOptions },
            { key: 'hasRating', label: 'Оцінка', value: params.hasRating, options: this.hasRatingOptions },
            { key: 'hasNotes', label: 'Нотатки', value: params.hasNotes, options: this.hasNotesOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    // 0 — валідне значення enum, тому порівнюємо з undefined, а не на truthy
    readonly hasActiveFilters = computed(() => {
        const p = this.searchParams();
        return !!p.query
            || p.status !== undefined
            || p.type !== undefined
            || p.hasRating !== undefined
            || p.hasNotes !== undefined
            || p.visibility !== undefined;
    });

    // Форматування, спільне зі списком фільмів (utils/media-format.util.ts)
    readonly formatDuration = formatDuration;
    readonly formatTimecode = formatTimecode;

    // Окремий стан для шаблону: початкове завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.watchingList().length === 0);
    readonly showError = computed(() => this.hasError() && this.watchingList().length === 0);
    readonly showEmpty = computed(
        () => !this.loading() && !this.hasError() && this.watchingList().length === 0
    );

    private readonly reload$ = new Subject<void>();
    private readonly deleteCallbacks = new Map<string, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const item = this.selectedItem();
        return item ? this.getDeleteCallback(item) : undefined;
    });

    constructor() {
        // switchMap скасовує попередній запит, якщо список перезавантажили повторно
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.userWatchingService.searchUserWatchingList(this.searchParams()).pipe(
                    map(res => ({ ok: true as const, ...this.normalizeResponse(res) })),
                    catchError(err => {
                        console.error('Помилка завантаження списку перегляду:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.watchingList.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити список перегляду.', 'error', 4000);
            }
            this.loading.set(false);
        });
    }

    ngOnInit(): void {
        this.loadList();
    }

    loadList(): void {
        this.reload$.next();
    }

    /** API може повертати як сторінку { items, totalCount }, так і простий масив. */
    private normalizeResponse(res: PageResponse<UserWatchingItem> | UserWatchingItem[] | null | undefined): { items: UserWatchingItem[]; total: number } {
        const items: UserWatchingItem[] = Array.isArray(res) ? res : (res?.items ?? []);
        const total: number = (!Array.isArray(res) && res?.totalCount) || items.length;
        return { items, total };
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
    progressLabel(item: UserWatchingItem): string {
        const parts: string[] = [];
        if (item.currentSeasonNumber) {
            parts.push(`Сезон ${item.currentSeasonNumber}`);
        }
        if (item.currentEpisodeNumber) {
            parts.push(`Серія ${item.currentEpisodeNumber}`);
        }
        return parts.join(' / ');
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(item: UserWatchingItem): void {
        this.selectedItem.set(item);
        this.isSidebarOpen.set(true);
    }

    closeSidebar(): void {
        this.isSidebarOpen.set(false);
    }

    onEditItem(): void {
        console.log('Редагувати елемент списку:', this.selectedItem()?.media?.id);
    }

    // ====================== Рейтинг ======================
    /** Оптимістичне оновлення: одразу показуємо нову оцінку, при помилці відкочуємо. */
    updateRating(item: UserWatchingItem, newRating: number): void {
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

    private patchItem(mediaId: string, patch: Partial<UserWatchingItem>): void {
        this.watchingList.update(list =>
            list.map(i => (i.media?.id === mediaId ? { ...i, ...patch } : i))
        );
    }

    // ====================== Видалення ======================
    getDeleteCallback(item: UserWatchingItem): DeleteCallback {
        const mediaId = item.media.id;

        let callback = this.deleteCallbacks.get(mediaId);
        if (!callback) {
            callback = () => this.userWatchingService.deleteUserWatching(mediaId);
            this.deleteCallbacks.set(mediaId, callback);
        }
        return callback;
    }

    onItemDeleted(item: UserWatchingItem): void {
        const mediaId = item.media.id;

        this.deleteCallbacks.delete(mediaId);
        this.watchingList.update(list => list.filter(i => i.media?.id !== mediaId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Успішно видалено зі списку перегляду', 'success', 3000);

        // Видалили останній елемент на сторінці > 1 — повертаємось на попередню
        const { offset = 0, size = DEFAULT_PAGE_SIZE } = this.searchParams();
        if (this.watchingList().length === 0 && offset > 0) {
            this.updateParams({ offset: Math.max(0, offset - size) });
        }
    }

    onSidebarItemDeleted(): void {
        const item = this.selectedItem();
        if (!item) {
            return;
        }

        this.onItemDeleted(item);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
    }

    onBackdropMouseDown(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isModalOpen()) {
            this.closeModal();
        }
    }

    onWatchingCreated(): void {
        this.closeModal();
        this.loadList();
    }

    copyToClipboard(url: string): void {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.show('Посилання скопійовано в буфер обміну! 📋', 'success', 2500);
        }).catch(err => {
            console.error('Не вдалося скопіювати посилання:', err);
            this.toastService.show('Помилка копіювання посилання.', 'error', 3000);
        });
    }

    // ====================== Пагінація, пошук, фільтри, сортування ======================
    onPaginationChange(event: { offset: number; size: number }): void {
        this.updateParams({ offset: event.offset, size: event.size });
    }

    onSearchQueryChanged(query: string): void {
        this.resetPageAndUpdate({ query: query || undefined });
    }

    onFilterChanged(event: { key: string; value: unknown }): void {
        if (!(FILTER_KEYS as readonly string[]).includes(event.key)) {
            return;
        }
        this.resetPageAndUpdate({ [event.key as FilterKey]: event.value } as Partial<UserWatchingSearchParams>);
    }

    onSortByChanged(sortBy: unknown): void {
        this.resetPageAndUpdate({ sortBy: sortBy as UserWatchingSortField | undefined });
    }

    onSortDirectionChanged(sort: SortDirection): void {
        this.resetPageAndUpdate({ sort });
    }

    resetFilters(): void {
        this.searchParams.update(p => ({
            offset: 0,
            size: p.size,
            sort: p.sort,
            sortBy: p.sortBy
        }));
        this.loadList();
    }

    private resetPageAndUpdate(patch: Partial<UserWatchingSearchParams>): void {
        this.updateParams({ ...patch, offset: 0 });
    }

    /** Зливає зміни в параметри (undefined прибирає ключ) і перезавантажує список. */
    private updateParams(patch: Partial<UserWatchingSearchParams>): void {
        this.searchParams.update(current => {
            const next: Record<string, unknown> = { ...current, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined) {
                    delete next[key];
                }
            }
            return next as UserWatchingSearchParams;
        });
        this.loadList();
    }
}