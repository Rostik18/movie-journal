import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { MediaFormComponent } from '../shared/media-form/media-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';
import { skipErrorToast } from '../../interceptors/http-error.interceptor';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem, MediaResponseSlim, MediaSidebar } from '../../models/media.model';
import { MediaType, MediaTypeLabels, Visibility, WatchStatus } from '../../models/enums';
import { CreateUserWatchingRequest } from '../../models/user-watching.model';
import { formatDuration } from '../../utils/media-format.util';
import { parseMediaSearch } from '../../utils/search-query';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { MediaSearchParams, MediaSortField, SortDirection } from '../../models/search.model';
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';
import { SearchChipComponent } from '../shared/search/search-chip.component';
import { enumOptions, SearchToolbarComponent, SortFieldOption, ToolbarFilter } from '../shared/search/search-toolbar.component';

type MediaId = MediaItem['id'];

interface WatchState {
    status: WatchStatus;
    rating: number | null;
}

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [
        RouterLink,
        SearchChipComponent,
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
    styleUrls: ['./movie-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieListComponent implements OnInit {
    private readonly mediaService = inject(MediaService);
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<MediaResponseSlim, MediaSearchParams>({
        search: params => this.mediaService.searchMedia(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Descending },
        filterKeys: ['type', 'visibility'],
        isFiltered: ({ query, tag, genre, author, type, visibility }) =>
            !!query || !!tag || !!genre || !!author || type !== undefined || visibility !== undefined,
        errorMessage: 'Не вдалося завантажити фільми.'
    });
    readonly movies = this.list.items;

    /**
     * Те, що користувач ввів у полі пошуку, як є («tag:космос»). У параметри API йде розібраний результат
     * (tag / genre / author / query), тому в поле повертаємо саме цей текст, а не параметри.
     */
    readonly searchText = signal('');

    // ---------- Модалка створення / редагування ----------
    private readonly mediaForm = viewChild(MediaFormComponent);
    readonly modal = createFormModal<MediaSidebar>(this.mediaForm);

    // ---------- Сайдбар деталей (/movies/:id) ----------
    readonly details = createDetailsRoute<MediaResponseSlim, MediaSidebar>({
        basePath: '/movies',
        fetch: id => this.mediaService.getMediaSidebar(id),
        errorMessage: 'Не вдалося завантажити деталі фільму',
        summary: {
            find: id => this.movies().find(m => m.id === id) ?? null,
            fromDetail: movie => movie
        }
    });
    /** Скорочений запис зі списку: доступний одразу, дає заголовок і постер, поки вантажаться деталі. */
    readonly selectedSlim = this.details.summary;
    /** Повний запис із GET /api/media/{id}/sidebar: усе для сайдбару одним запитом (склад з фото, колекція, автор). */
    readonly selectedMovie = this.details.detail;

    private readonly deleteCallbacks = createDeleteCallbacks((id: MediaId) => this.mediaService.deleteMedia(id));

    readonly selectedDeleteCallback = computed(() => {
        const movie = this.selectedSlim();
        return movie ? this.deleteCallbacks.get(movie.id) : undefined;
    });

    readonly mediaTypeLabels = MediaTypeLabels;

    // Форматування, спільне з іншими списками (utils/media-format.util.ts)
    readonly formatDuration = formatDuration;

    // Робимо Enum доступними у шаблоні
    readonly SortDirection = SortDirection;

    // ---------- Панель пошуку: опції будуються з enum-ів ----------
    private readonly typeOptions = enumOptions(MediaType, MediaTypeLabels);

    private readonly visibilityOptions = enumOptions(
        Visibility,
        { [Visibility.Public]: 'Публічні', [Visibility.Private]: 'Приватні' },
        { [Visibility.Public]: 'globe', [Visibility.Private]: 'lock' }
    );

    readonly movieSortFields: SortFieldOption[] = enumOptions(MediaSortField, {
        [MediaSortField.Title]: 'Назвою',
        [MediaSortField.Creator]: 'Автором',
        [MediaSortField.ReleaseYear]: 'Роком випуску',
        [MediaSortField.CreatedAt]: 'Датою створення',
        [MediaSortField.UpdatedAt]: 'Датою оновлення'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.list.searchParams();
        return [
            { key: 'type', label: 'Тип', value: params.type, options: this.typeOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    private readonly watchStates = signal<ReadonlyMap<MediaId, WatchState>>(new Map());

    /** Пошуковий рядок → один із параметрів API за префіксом (tag:, жанр:, автор:, назва: …) або query. */
    onSearchTextChanged(text: string): void {
        this.searchText.set(text);

        const { param, value } = parseMediaSearch(text);
        this.list.updateParams({
            query: undefined,
            tag: undefined,
            genre: undefined,
            author: undefined,
            [param]: value || undefined,
            offset: 0
        });
    }

    resetFilters(): void {
        this.searchText.set('');
        this.list.resetFilters();
    }

    ngOnInit(): void {
        this.details.watchRoute();
        this.applySearchFromUrl();

        // З готовим пошуком у посиланні (?q=) список завантажує applySearchFromUrl, щоб не робити зайвий запит
        if (!this.route.snapshot.queryParamMap.has('q')) {
            this.list.load();
        }
    }

    /**
     * Посилання з тегів і жанрів по всьому застосунку ведуть на /movies?q=тег:космос.
     * Застосовуємо пошук і прибираємо q з адреси, щоб перезавантаження сторінки не повторювало його
     * (а наступний клік по тегу знову спрацював навіть для того самого значення).
     */
    private applySearchFromUrl(): void {
        this.route.queryParamMap.pipe(
            map(params => params.get('q')),
            filter((text): text is string => text !== null),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(text => {
            this.onSearchTextChanged(text);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { q: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        });
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

        this.userWatchingService.createOrUpdateWatchlist(request, skipErrorToast()).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => this.toastService.show(successMessage, 'success', 3000),
            error: () => {
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

    onEditMovie(): void {
        const movie = this.selectedMovie();
        if (!movie) {
            this.toastService.show('Деталі фільму ще завантажуються.', 'info', 3000);
            return;
        }
        this.modal.openEdit(movie);
    }

    // ====================== Видалення ======================
    onSidebarMovieDeleted(): void {
        const movie = this.selectedSlim();
        if (!movie) {
            return;
        }

        this.deleteCallbacks.forget(movie.id);
        this.setWatchState(movie.id, undefined);
        this.list.removeItems(m => m.id === movie.id);
        this.toastService.show('Фільм успішно видалено', 'success', 3000);
        this.details.close();
    }

    // ====================== Форма ======================
    onMediaUpdated(updated: MediaItem): void {
        this.modal.close();

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
            // Відповідь на оновлення має короткий склад і лише посилання на колекцію: одразу показуємо нові поля,
            // а склад і колекцію підтягуємо тихим запитом до сайдбару (без індикатора завантаження)
            this.selectedMovie.update(current => current ? {
                ...current,
                ...updated,
                cast: current.cast,
                collection: current.collection
            } : current);
            this.details.refresh();
        }
        const slim = this.selectedSlim();
        if (slim?.id === updated.id) {
            this.selectedSlim.set(this.movies().find(m => m.id === updated.id) ?? slim);
        }
    }

    onMediaCreated(): void {
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