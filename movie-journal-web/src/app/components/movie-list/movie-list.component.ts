import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { MediaFormComponent } from '../shared/media-form/media-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem, MediaResponseSlim, MediaSidebar } from '../../models/media.model';
import { MediaType, MediaTypeLabels, Visibility, WatchStatus } from '../../models/enums';
import { CreateUserWatchingRequest } from '../../models/user-watching.model';
import { formatDuration } from '../../utils/media-format.util';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SearchToolbarComponent, SortFieldOption, ToolbarFilter, enumOptions } from '../shared/search-toolbar/search-toolbar.component';
import { MediaSearchParams, MediaSortField, SortDirection } from '../../models/search.model';
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';

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

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<MediaResponseSlim, MediaSearchParams>({
        search: params => this.mediaService.searchMedia(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Descending },
        filterKeys: ['type', 'visibility'],
        isFiltered: ({ query, type, visibility }) => !!query || type !== undefined || visibility !== undefined,
        errorMessage: 'Не вдалося завантажити фільми.'
    });
    readonly movies = this.list.items;

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

    ngOnInit(): void {
        this.details.watchRoute();
        this.list.load();
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