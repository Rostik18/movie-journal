import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, EMPTY, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { MediaFormComponent } from '../shared/media-form/media-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem } from '../../models/media.model';
import { MediaTypeLabels, WatchStatus } from '../../models/enums';
import { PageResponse } from '../../models/shared.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type DeleteCallback = () => ReturnType<MediaService['deleteMedia']>;
type MediaId = MediaItem['id'];

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [
        CommonModule,
        ViewSwitcherComponent,
        MediaFormComponent,
        AddButtonComponent,
        GridCardComponent,
        DetailsSidebarComponent
    ],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.scss']
})
export class MovieListComponent implements OnInit {
    private mediaService = inject(MediaService);
    private userWatchingService = inject(UserWatchingService);
    private toastService = inject(ToastService);

    readonly movies = signal<MediaItem[]>([]);
    readonly totalCount = signal<number>(0);
    readonly loading = signal<boolean>(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal<boolean>(false);

    readonly selectedMovie = signal<MediaItem | null>(null);
    readonly isSidebarOpen = signal<boolean>(false);

    readonly mediaTypeLabels = MediaTypeLabels;
    readonly watchStatusOptions = [
        { status: WatchStatus.Wishlist, label: 'У планах', class: 'wishlist' },
        { status: WatchStatus.Watching, label: 'Дивлюся', class: 'watching' },
        { status: WatchStatus.Watched, label: 'Переглянуто', class: 'watched' },
        { status: WatchStatus.Dropped, label: 'Покинуто', class: 'dropped' }
    ];

    readonly showInitialLoading = computed(() => this.loading() && this.movies().length === 0);
    readonly showError = computed(() => this.hasError() && this.movies().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.movies().length === 0);

    private readonly reload$ = new Subject<void>();
    private readonly details$ = new Subject<MediaId>();

    constructor() {
        // Реактивне завантаження списку фільмів
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

        // Реактивне завантаження деталей фільму для сайдбару (з можливістю скасування)
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

    loadMovies(): void {
        this.reload$.next();
    }

    openDetails(movie: MediaItem): void {
        this.details$.next(movie.id);
    }

    ngOnInit() {
        this.loadMovies();
    }

    closeSidebar() {
        this.isSidebarOpen.set(false);
    }

    onEditMovie() {
        console.log('Редагувати фільм:', this.selectedMovie()?.id);
    }

    // Методи відкриття/закриття модалки додавання
    openModal() {
        this.isModalOpen.set(true);
    }

    closeModal() {
        this.isModalOpen.set(false);
    }

    onMediaCreated() {
        this.closeModal();
        this.loadMovies();
    }

    setWatchStatus(movie: MediaItem, status: WatchStatus) {
        const request = {
            mediaId: movie.id,
            status: status
        };

        this.userWatchingService.addToWatchlist(request).subscribe({
            next: () => this.toastService.show(`Статус фільму "${movie.title}" оновлено! 🎬`, 'success', 3000)
        });
    }

    getDeleteCallback(movie: MediaItem): DeleteCallback {
        const movieId = movie.id;
        return () => this.mediaService.deleteMedia(movieId);
    }

    onDeleted(movie: MediaItem) {
        const movieId = movie.id;
        this.movies.update(list => list.filter(m => m.id !== movieId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Фільм успішно видалено', 'success', 3000);
    }

    onSidebarMovieDeleted() {
        const movie = this.selectedMovie();
        if (!movie) return;

        this.onDeleted(movie);
        this.closeSidebar();
    }
}