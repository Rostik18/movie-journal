import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { UserWatchingService } from '../../services/user-watching.service';
import { MediaItem } from '../../models/media.model';
import { MediaTypeLabels, WatchStatus } from '../../models/enums';

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule],
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

    // Опції статусів для кнопок
    watchStatusOptions = [
        { status: WatchStatus.Wishlist, label: 'У планах', class: 'wishlist' },
        { status: WatchStatus.Watching, label: 'Дивлюся', class: 'watching' },
        { status: WatchStatus.Watched, label: 'Переглянуто', class: 'watched' },
        { status: WatchStatus.Dropped, label: 'Покинуто', class: 'dropped' }
    ];

    ngOnInit() {
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

    // Універсальний метод для встановлення будь-якого статусу
    setWatchStatus(movie: MediaItem, status: WatchStatus) {
        const request = {
            mediaId: movie.id,
            status: status,
            rating: status === WatchStatus.Watched ? 10 : null // Оцінку за замовчуванням даємо тільки якщо переглянуто
        };

        this.userWatchingService.addToWatchlist(request).subscribe({
            next: () => {
                alert(`Статус фільму "${movie.title}" оновлено! 🎬`);
            },
            error: (err) => {
                console.error('Помилка при збереженні статусу:', err);
                alert('Не вдалося оновити статус.');
            }
        });
    }
}