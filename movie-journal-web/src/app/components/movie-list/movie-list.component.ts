import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { MediaFormComponent } from '../shared/media-form/media-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem, MediaResponseSlim } from '../../models/media.model';
import { MediaType, MediaTypeLabels, Visibility, WatchStatus } from '../../models/enums';
import { PageResponse } from '../../models/shared.model';
import { CreateUserWatchingRequest } from '../../models/user-watching.model';
import { formatDuration } from '../../utils/media-format.util';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SearchToolbarComponent, SortFieldOption, ToolbarFilter, enumOptions } from '../shared/search-toolbar/search-toolbar.component';
import { MediaSearchParams, MediaSortField, SortDirection } from '../../models/search.model';

type DeleteCallback = () => ReturnType<MediaService['deleteMedia']>;
type MediaId = MediaItem['id'];

/** Ключі MediaSearchParams, якими керують кнопки-фільтри тулбара. */
const FILTER_KEYS = ['type', 'visibility'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULT_PAGE_SIZE = 20;

interface WatchState {
    status: WatchStatus;
    rating: number | null;
}

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [
        ViewSwitcherComponent,
        MediaFormComponent,
        AddButtonComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        RatingStarsComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.scss']
})
export class MovieListComponent implements OnInit {
    private readonly mediaService = inject(MediaService);
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly movies = signal<MediaResponseSlim[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);
    /** Фільм, що редагується; null — модалка працює в режимі створення. */
    readonly editingMovie = signal<MediaItem | null>(null);
    private readonly mediaForm = viewChild(MediaFormComponent);

    // ---------- Сайдбар деталей ----------
    /** Скорочений запис зі списку: доступний одразу, дає заголовок і постер, поки вантажаться деталі. */
    readonly selectedSlim = signal<MediaResponseSlim | null>(null);
    /** Повний запис із getMediaById: усе, що потрібно сайдбару. */
    readonly selectedMovie = signal<MediaItem | null>(null);
    readonly isSidebarOpen = signal(false);
    readonly detailsLoading = signal(false);
    readonly detailsError = signal(false);

    readonly mediaTypeLabels = MediaTypeLabels;

    // Форматування, спільне з іншими списками (utils/media-format.util.ts)
    readonly formatDuration = formatDuration;

    // Робимо Enum доступними у шаблоні
    readonly SortDirection = SortDirection;

    readonly searchParams = signal<MediaSearchParams>({
        offset: 0,
        size: DEFAULT_PAGE_SIZE,
        sort: SortDirection.Descending
    });

    // ---------- Панель пошуку: опції будуються з enum-ів ----------
    private readonly typeOptions = enumOptions(MediaType, MediaTypeLabels);

    private readonly visibilityOptions = enumOptions(
        Visibility,
        { [Visibility.Public]: 'Публічні', [Visibility.Private]: 'Приватні' },
        { [Visibility.Public]: 'globe', [Visibility.Private]: 'lock' }
    );

    readonly movieSortFields: SortFieldOption[] = enumOptions(MediaSortField, {
        [MediaSortField.Title]: 'Назвою',
        [MediaSortField.Author]: 'Автором',
        [MediaSortField.ReleaseYear]: 'Роком випуску',
        [MediaSortField.CreatedAt]: 'Датою створення',
        [MediaSortField.UpdatedAt]: 'Датою оновлення'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.searchParams();
        return [
            { key: 'type', label: 'Тип', value: params.type, options: this.typeOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    readonly hasActiveFilters = computed(() => {
        const { query, type, visibility } = this.searchParams();
        return !!query || type !== undefined || visibility !== undefined;
    });

    readonly showInitialLoading = computed(() => this.loading() && this.movies().length === 0);
    readonly showError = computed(() => this.hasError() && this.movies().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.movies().length === 0);

    private readonly watchStates = signal<ReadonlyMap<MediaId, WatchState>>(new Map());

    private readonly reload$ = new Subject<void>();
    /** id фільму для завантаження деталей; null — скасувати поточний запит. */
    private readonly details$ = new Subject<MediaId | null>();

    private readonly deleteCallbacks = new Map<MediaId, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const movie = this.selectedSlim();
        return movie ? this.getDeleteCallback(movie) : undefined;
    });

    constructor() {
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.mediaService.searchMedia(this.searchParams()).pipe(
                    map((response: PageResponse<MediaResponseSlim>) => ({
                        ok: true as const,
                        items: response.items ?? [],
                        total: response.totalCount ?? response.items?.length ?? 0
                    })),
                    catchError(err => {
                        console.error('Помилка завантаження фільмів:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.movies.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити фільми.', 'error', 4000);
            }
            this.loading.set(false);
        });

        // Деталі для сайдбару: switchMap відкидає відповідь, якщо користувач
        // клікнув інший фільм або закрив сайдбар до її приходу
        this.details$.pipe(
            switchMap(id => {
                if (id === null) {
                    return of(null);
                }
                this.detailsLoading.set(true);
                this.detailsError.set(false);
                return this.mediaService.getMediaById(id).pipe(
                    map(movie => ({ ok: true as const, movie })),
                    catchError(err => {
                        console.error('Помилка завантаження деталей фільму:', err);
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
                if (this.selectedSlim()?.id !== result.movie.id) {
                    this.selectedSlim.set(result.movie);
                }
                this.selectedMovie.set(result.movie);
            } else {
                this.detailsError.set(true);
                this.toastService.show('Не вдалося завантажити деталі фільму', 'error');
            }
        });
    }

    /** URL — джерело правди для сайдбару: /movies/:id відкриває деталі (також при прямому переході й Back/Forward).
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
        this.loadMovies();
    }

    loadMovies(): void {
        this.reload$.next();
    }

    typeLabel(type: MediaItem['type'] | null | undefined): string {
        return type == null ? '—' : (this.mediaTypeLabels[type] ?? String(type));
    }

    ratingOf(movie: MediaResponseSlim): number | null {
        return this.watchStates().get(movie.id)?.rating ?? null;
    }

    isWishlisted(movie: MediaResponseSlim): boolean {
        return this.watchStates().get(movie.id)?.status === WatchStatus.Wishlist;
    }

    rateMovie(movie: MediaResponseSlim, rating: number): void {
        this.updateWatchlist(
            movie,
            { mediaId: movie.id, status: WatchStatus.Watched, rating },
            `Оцінку "${movie.title}" збережено: ${rating}/10 ⭐`
        );
    }

    addToWishlist(movie: MediaResponseSlim): void {
        this.updateWatchlist(
            movie,
            { mediaId: movie.id, status: WatchStatus.Wishlist },
            `"${movie.title}" додано до планів 🔖`
        );
    }

    private updateWatchlist(movie: MediaResponseSlim, request: CreateUserWatchingRequest, successMessage: string): void {
        const previous = this.watchStates().get(movie.id);

        this.setWatchState(movie.id, {
            status: request.status,
            rating: request.rating ?? previous?.rating ?? null
        });

        this.userWatchingService.createOrUpdateWatchlist(request).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => this.toastService.show(successMessage, 'success', 3000),
            error: err => {
                console.error('Помилка оновлення списку перегляду:', err);
                this.setWatchState(movie.id, previous);
                this.toastService.show(`Не вдалося оновити "${movie.title}".`, 'error', 4000);
            }
        });
    }

    private setWatchState(id: MediaId, state: WatchState | undefined): void {
        this.watchStates.update(current => {
            const next = new Map(current);
            if (state) {
                next.set(id, state);
            } else {
                next.delete(id);
            }
            return next;
        });
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(movie: MediaResponseSlim): void {
        this.showSidebarFor(movie.id, movie);
        this.router.navigate(['/movies', movie.id]);
    }

    /** Також викликається кнопкою «Спробувати знову» у сайдбарі. */
    loadDetails(): void {
        const id = this.selectedSlim()?.id ?? this.route.snapshot.paramMap.get('id');
        if (id) {
            this.details$.next(id);
        }
    }

    closeSidebar(): void {
        this.hideSidebar();
        if (this.route.snapshot.paramMap.has('id')) {
            this.router.navigate(['/movies']);
        }
    }

    private showSidebarFor(id: MediaId, slim: MediaResponseSlim | null): void {
        this.selectedSlim.set(slim);
        this.selectedMovie.set(null); // не показуємо дані попереднього фільму
        this.isSidebarOpen.set(true);
        this.details$.next(id);
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
        if (this.isSidebarOpen() && this.selectedSlim()?.id === id) {
            return;
        }
        this.showSidebarFor(id, this.movies().find(m => m.id === id) ?? null);
    }

    onEditMovie(): void {
        const movie = this.selectedMovie();
        if (!movie) {
            this.toastService.show('Деталі фільму ще завантажуються.', 'info', 3000);
            return;
        }
        this.editingMovie.set(movie);
        this.isModalOpen.set(true);
    }

    // ====================== Видалення ======================
    getDeleteCallback(movie: MediaResponseSlim): DeleteCallback {
        const movieId = movie.id;

        let callback = this.deleteCallbacks.get(movieId);
        if (!callback) {
            callback = () => this.mediaService.deleteMedia(movieId);
            this.deleteCallbacks.set(movieId, callback);
        }
        return callback;
    }

    onDeleted(movie: MediaResponseSlim): void {
        const movieId = movie.id;

        this.deleteCallbacks.delete(movieId);
        this.setWatchState(movieId, undefined);
        this.movies.update(list => list.filter(m => m.id !== movieId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Фільм успішно видалено', 'success', 3000);

        // Видалили останній елемент на сторінці > 1 — повертаємось на попередню
        const { offset = 0, size = DEFAULT_PAGE_SIZE } = this.searchParams();
        if (this.movies().length === 0 && offset > 0) {
            this.updateParams({ offset: Math.max(0, offset - size) });
        }
    }

    onSidebarMovieDeleted(): void {
        const movie = this.selectedSlim();
        if (!movie) {
            return;
        }

        this.onDeleted(movie);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.editingMovie.set(null);
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
        this.editingMovie.set(null);
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
        if (!this.mediaForm()?.hasChanges()) {
            this.closeModal();
        }
    }

    onMediaUpdated(updated: MediaItem): void {
        this.closeModal();

        this.movies.update(list => list.map(m => m.id === updated.id
            ? {
                ...m,
                title: updated.title,
                releaseYear: updated.releaseYear,
                duration: updated.duration,
                posterUrl: updated.posterUrl,
                genres: updated.genres,
                links: updated.links,
                visibility: updated.visibility
            }
            : m));

        if (this.selectedMovie()?.id === updated.id) {
            this.selectedMovie.set(updated);
        }
        const slim = this.selectedSlim();
        if (slim?.id === updated.id) {
            this.selectedSlim.set(this.movies().find(m => m.id === updated.id) ?? slim);
        }
    }

    onMediaCreated(): void {
        this.closeModal();
        this.loadMovies();
    }

    copyToClipboard(url: string): void {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.show('Посилання скопійовано в буфер обміну! 📋', 'success', 2500);
        }).catch(err => {
            console.error('Не вдалося скопіювати посилання:', err);
            this.toastService.show('Помилка копіювання посилання.', 'error', 3000);
        });
    }

    onPaginationChange(event: { offset: number; size: number }): void {
        this.updateParams({ offset: event.offset, size: event.size });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ====================== Пошук, фільтри, сортування ======================
    onSearchQueryChanged(query: string): void {
        this.resetPageAndUpdate({ query: query || undefined });
    }

    onFilterChanged(event: { key: string; value: unknown }): void {
        if (!(FILTER_KEYS as readonly string[]).includes(event.key)) {
            return;
        }
        this.resetPageAndUpdate({ [event.key as FilterKey]: event.value } as Partial<MediaSearchParams>);
    }

    onSortByChanged(sortBy: unknown): void {
        this.resetPageAndUpdate({ sortBy: sortBy as MediaSortField | undefined });
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
        this.loadMovies();
    }

    private resetPageAndUpdate(patch: Partial<MediaSearchParams>): void {
        this.updateParams({ ...patch, offset: 0 });
    }

    /** Зливає зміни в параметри (undefined прибирає ключ) і перезавантажує список. */
    private updateParams(patch: Partial<MediaSearchParams>): void {
        this.searchParams.update(current => {
            const next: Record<string, unknown> = { ...current, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined) {
                    delete next[key];
                }
            }
            return next as MediaSearchParams;
        });
        this.loadMovies();
    }
}