import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

import { UserWatchingService } from '../../services/user-watching.service';
import { ToastService } from '../../services/toast.service';
import { UserWatchingItem, UserWatchingResponseSlim } from '../../models/user-watching.model';
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
    styleUrls: ['./user-watching-list.component.scss']
})
export class UserWatchingListComponent implements OnInit {
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly watchingList = signal<UserWatchingResponseSlim[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);
    /** Запис, що редагується; null — модалка працює в режимі додавання. */
    readonly editingItem = signal<UserWatchingItem | null>(null);
    private readonly watchingForm = viewChild(UserWatchingFormComponent);

    // ---------- Сайдбар деталей ----------
    /** Скорочений запис зі списку: доступний одразу, дає заголовок і постер, поки вантажаться деталі. */
    readonly selectedSlim = signal<UserWatchingResponseSlim | null>(null);
    /** Повний запис із getById: усе, що потрібно сайдбару. */
    readonly selectedItem = signal<UserWatchingItem | null>(null);
    readonly isSidebarOpen = signal(false);
    readonly detailsLoading = signal(false);
    readonly detailsError = signal(false);

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
    /** mediaId для завантаження деталей; null — скасувати поточний запит. */
    private readonly details$ = new Subject<string | null>();
    private readonly deleteCallbacks = new Map<string, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const item = this.selectedSlim();
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

        // Деталі для сайдбару: switchMap відкидає відповідь, якщо користувач
        // клікнув іншу плитку або закрив сайдбар до її приходу
        this.details$.pipe(
            switchMap(mediaId => {
                if (mediaId === null) {
                    return of(null);
                }
                this.detailsLoading.set(true);
                this.detailsError.set(false);
                return this.userWatchingService.getByMediaId(mediaId).pipe(
                    map(item => ({ ok: true as const, item })),
                    catchError(err => {
                        console.error('Помилка завантаження деталей:', err);
                        return of({ ok: false as const });
                    })
                );
            }),
            takeUntilDestroyed()
        ).subscribe(result => {
            this.detailsLoading.set(false);
            if (result === null) {
                return;
            }
            if (result.ok) {
                // Пряме посилання: скороченого запису зі списку немає — будуємо його з повного
                if (this.selectedSlim()?.media?.id !== result.item.media.id) {
                    this.selectedSlim.set({
                        media: result.item.media,
                        status: result.item.status,
                        rating: result.item.rating,
                        notes: result.item.notes
                    });
                }
                this.selectedItem.set(result.item);
            } else {
                this.detailsError.set(true);
                this.toastService.show('Не вдалося завантажити деталі.', 'error', 4000);
            }
        });
    }

    /** URL — джерело правди для сайдбару: /watchlist/:id відкриває деталі (також при прямому переході й Back/Forward).
     *  Викликається з ngOnInit, коли потоки деталей уже підписані (Subject не буферизує). */
    private watchRoute(): void {
        this.route.paramMap.pipe(
            map(params => params.get('id')),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(id => this.syncSidebarWithRoute(id));
    }

    ngOnInit(): void {
        this.watchRoute();
        this.loadList();
    }

    loadList(): void {
        this.reload$.next();
    }

    /** API може повертати як сторінку { items, totalCount }, так і простий масив. */
    private normalizeResponse(res: PageResponse<UserWatchingResponseSlim> | UserWatchingResponseSlim[] | null | undefined): { items: UserWatchingResponseSlim[]; total: number } {
        const items: UserWatchingResponseSlim[] = Array.isArray(res) ? res : (res?.items ?? []);
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
    openDetails(item: UserWatchingResponseSlim): void {
        this.showSidebarFor(item.media.id, item);
        this.router.navigate(['/watchlist', item.media.id]);
    }

    /** Також викликається кнопкою «Спробувати знову» у сайдбарі. */
    loadDetails(): void {
        const id = this.selectedSlim()?.media?.id ?? this.route.snapshot.paramMap.get('id');
        if (id) {
            this.details$.next(id);
        }
    }

    closeSidebar(): void {
        this.hideSidebar();
        if (this.route.snapshot.paramMap.has('id')) {
            this.router.navigate(['/watchlist']);
        }
    }

    private showSidebarFor(mediaId: string, slim: UserWatchingResponseSlim | null): void {
        this.selectedSlim.set(slim);
        this.selectedItem.set(null); // не показуємо дані попереднього запису
        this.isSidebarOpen.set(true);
        this.details$.next(mediaId);
    }

    private hideSidebar(): void {
        this.isSidebarOpen.set(false);
        this.details$.next(null); // скасовуємо запит, що ще летить
        this.detailsError.set(false);
    }

    private syncSidebarWithRoute(id: string | null): void {
        if (!id) {
            if (this.isSidebarOpen()) {
                this.hideSidebar();
            }
            return;
        }
        // Уже відкрито через клік у списку — нічого не робимо
        if (this.isSidebarOpen() && this.selectedSlim()?.media?.id === id) {
            return;
        }
        this.showSidebarFor(id, this.watchingList().find(i => i.media?.id === id) ?? null);
    }

    onEditItem(): void {
        const item = this.selectedItem();
        if (!item) {
            this.toastService.show('Деталі ще завантажуються.', 'info', 3000);
            return;
        }
        this.editingItem.set(item);
        this.isModalOpen.set(true);
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
            this.selectedItem.update(i => (i ? { ...i, ...(patch as Partial<UserWatchingItem>) } : i));
        }
    }

    // ====================== Видалення ======================
    getDeleteCallback(item: UserWatchingResponseSlim): DeleteCallback {
        const mediaId = item.media.id;

        let callback = this.deleteCallbacks.get(mediaId);
        if (!callback) {
            callback = () => this.userWatchingService.deleteUserWatching(mediaId);
            this.deleteCallbacks.set(mediaId, callback);
        }
        return callback;
    }

    onItemDeleted(item: UserWatchingResponseSlim): void {
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
        const item = this.selectedSlim();
        if (!item) {
            return;
        }

        this.onItemDeleted(item);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.editingItem.set(null);
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
        this.editingItem.set(null);
    }

    onBackdropMouseDown(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModalUnlessDirty();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isModalOpen()) {
            this.closeModalUnlessDirty();
        }
    }

    /** Backdrop/Escape не закривають форму з незбереженими змінами (хрестик — закриває завжди). */
    private closeModalUnlessDirty(): void {
        if (!this.watchingForm()?.hasChanges()) {
            this.closeModal();
        }
    }

    onWatchingUpdated(updated: UserWatchingItem): void {
        this.closeModal();

        const mediaId = updated.media?.id ?? this.selectedSlim()?.media?.id;
        if (!mediaId) {
            this.loadList();
            return;
        }

        this.watchingList.update(list => list.map(i => i.media?.id === mediaId
            ? { ...i, status: updated.status, rating: updated.rating, notes: updated.notes }
            : i));

        const slim = this.selectedSlim();
        if (slim?.media?.id === mediaId) {
            this.selectedSlim.set({ ...slim, status: updated.status, rating: updated.rating, notes: updated.notes });
        }
        if (this.selectedItem()?.media?.id === mediaId) {
            this.selectedItem.update(current => (current ? { ...current, ...updated, media: updated.media ?? current.media } : current));
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