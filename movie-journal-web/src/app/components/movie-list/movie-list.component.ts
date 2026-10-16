import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem } from '../../models/media.model';
import { MediaTypeLabels, WatchStatus } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher.component';
import { MediaFormComponent } from '../shared/media-form/media-form.component'; // Імпортуємо форму
import { AddButtonComponent } from '../shared/add-button/add-button.component'; // Імпортуємо кнопку додавання

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, MediaFormComponent, AddButtonComponent],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.scss']
})
export class MovieListComponent implements OnInit {
    private mediaService = inject(MediaService);
    private userWatchingService = inject(UserWatchingService);

    movies = signal<MediaItem[]>([]);
    totalCount = signal<number>(0);
    loading = signal<boolean>(true);

    mediaTypeLabels = MediaTypeLabels;
    viewMode = signal<'grid' | 'list'>('grid');

    // Сигнал для керування відкриттям модального вікна
    isModalOpen = signal<boolean>(false);

    watchStatusOptions = [
        { status: WatchStatus.Wishlist, label: 'У планах', class: 'wishlist' },
        { status: WatchStatus.Watching, label: 'Дивлюся', class: 'watching' },
        { status: WatchStatus.Watched, label: 'Переглянуто', class: 'watched' },
        { status: WatchStatus.Dropped, label: 'Покинуто', class: 'dropped' }
    ];

    ngOnInit() {
        this.loadMovies();
    }

    loadMovies() {
        this.loading.set(true);
        this.mediaService.searchMedia().subscribe({
            next: (response) => {
                this.movies.set(response.items);
                this.totalCount.set(response.totalCount);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка при завантаженні медіа:', err);
                this.loading.set(false);
            }
        });
    }

    // Методи відкриття/закриття модалки
    openModal() {
        this.isModalOpen.set(true);
    }

    closeModal() {
        this.isModalOpen.set(false);
    }

    // Викликається, коли фільм успішно створено у формі
    onMediaCreated() {
        this.closeModal();
        this.loadMovies(); // Оновлюємо список фільмів
    }

    setWatchStatus(movie: MediaItem, status: WatchStatus) {
        const request = {
            mediaId: movie.id,
            status: status,
            rating: status === WatchStatus.Watched ? 10 : null
        };

        this.userWatchingService.addToWatchlist(request).subscribe({
            next: () => alert(`Статус фільму "${movie.title}" оновлено! 🎬`)
        });
    }
}