import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { MediaFormComponent } from '../shared/media-form/media-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem } from '../../models/media.model';
import { MediaTypeLabels, WatchStatus } from '../../models/enums';
import { PageResponse } from '../../models/shared.model';
import { CreateUserWatchingRequest } from '../../models/user-watching.model';
import { formatDuration, formatSubtitle } from '../../utils/media-format.util';

type DeleteCallback = () => ReturnType<MediaService['deleteMedia']>;
type MediaId = MediaItem['id'];

/** Стан користувача для фільму в межах цієї сторінки (оцінка та статус). */
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
        RatingStarsComponent
    ],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.scss']
})
export class MovieListComponent implements OnInit {
    private readonly mediaService = inject(MediaService);
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly movies = signal<MediaItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);

    readonly selectedMovie = signal<MediaItem | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly mediaTypeLabels = MediaTypeLabels;

    // Стани для шаблону: початкове завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.movies().length === 0);
    readonly showError = computed(() => this.hasError() && this.movies().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.movies().length === 0);

    /**
     * Оцінки та статуси, які користувач виставив на цій сторінці. Потрібні, щоб зірки та закладка
     * не скидались при перемиканні плитки/таблиця й щоб при помилці запиту можна було відкотити зміну.
     * Якщо бекенд віддає в списку фільмів статус/оцінку користувача, мапу варто заповнювати з відповіді.
     */
    private readonly watchStates = signal<ReadonlyMap<MediaId, WatchState>>(new Map());

    private readonly reload$ = new Subject<void>();
    private readonly details$ = new Subject<MediaId>();

    /** Колбеки видалення кешуються, щоб у шаблоні не створювалась нова функція на кожен цикл CD. */
    private readonly deleteCallbacks = new Map<MediaId, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const movie = this.selectedMovie();
        return movie ? this.getDeleteCallback(movie) : undefined;
    });

    constructor() {
        // switchMap скасовує попередній запит, якщо список перезавантажили повторно
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.mediaService.searchMedia().pipe(
                    map((response: PageResponse<MediaItem>) => ({
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

        // Деталі для сайдбару: швидкі кліки по різних фільмах скасовують попередній запит
        this.details$.pipe(
            switchMap(id =>
                this.mediaService.getMediaById(id).pipe(
                    catchError(err => {
                        console.error('Помилка завантаження деталей фільму:', err);
                        this.toastService.show('Не вдалося завантажити деталі фільму', 'error');
                        return EMPTY;
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(detailedMovie => {
            this.selectedMovie.set(detailedMovie);
            this.isSidebarOpen.set(true);
        });
    }

    ngOnInit(): void {
        this.loadMovies();
    }

    loadMovies(): void {
        this.reload$.next();
    }

    // ====================== Відображення полів ======================
    // Форматування спільне зі списком перегляду (utils/media-format.util.ts)
    readonly subtitle = formatSubtitle;
    readonly formatDuration = formatDuration;

    typeLabel(type: MediaItem['type'] | null | undefined): string {
        return type == null ? '—' : (this.mediaTypeLabels[type] ?? String(type));
    }

    // ====================== Оцінка та план перегляду ======================
    ratingOf(movie: MediaItem): number | null {
        return this.watchStates().get(movie.id)?.rating ?? null;
    }

    isWishlisted(movie: MediaItem): boolean {
        return this.watchStates().get(movie.id)?.status === WatchStatus.Wishlist;
    }

    /** Клік по зірці: фільм позначається переглянутим з обраною оцінкою. */
    rateMovie(movie: MediaItem, rating: number): void {
        this.updateWatchlist(
            movie,
            { mediaId: movie.id, status: WatchStatus.Watched, rating },
            `Оцінку "${movie.title}" збережено: ${rating}/10 ⭐`
        );
    }

    /** Клік по закладці: фільм додається до планів. Оцінка в запит не передається. */
    addToWishlist(movie: MediaItem): void {
        this.updateWatchlist(
            movie,
            { mediaId: movie.id, status: WatchStatus.Wishlist },
            `"${movie.title}" додано до планів 🔖`
        );
    }

    /** Оптимістичне оновлення: інтерфейс реагує одразу, при помилці стан відкочується. */
    private updateWatchlist(movie: MediaItem, request: CreateUserWatchingRequest, successMessage: string): void {
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
    openDetails(movie: MediaItem): void {
        this.details$.next(movie.id);
    }

    /**
     * selectedMovie навмисно не скидається: поки панель виїжджає, її вміст має лишатись на місці.
     * Наступне відкриття перезаписує його свіжими даними.
     */
    closeSidebar(): void {
        this.isSidebarOpen.set(false);
    }

    onEditMovie(): void {
        console.log('Редагувати фільм:', this.selectedMovie()?.id);
    }

    // ====================== Видалення ======================
    getDeleteCallback(movie: MediaItem): DeleteCallback {
        const movieId = movie.id;

        let callback = this.deleteCallbacks.get(movieId);
        if (!callback) {
            callback = () => this.mediaService.deleteMedia(movieId);
            this.deleteCallbacks.set(movieId, callback);
        }
        return callback;
    }

    onDeleted(movie: MediaItem): void {
        const movieId = movie.id;

        this.deleteCallbacks.delete(movieId);
        this.setWatchState(movieId, undefined);
        this.movies.update(list => list.filter(m => m.id !== movieId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Фільм успішно видалено', 'success', 3000);
    }

    onSidebarMovieDeleted(): void {
        const movie = this.selectedMovie();
        if (!movie) {
            return;
        }

        this.onDeleted(movie);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
    }

    /** Закриваємо лише коли mousedown стався саме на підложці (а не після виділення тексту). */
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

    onMediaCreated(): void {
        this.closeModal();
        this.loadMovies();
    }
}