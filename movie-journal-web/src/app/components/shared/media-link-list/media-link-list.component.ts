import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaTypeLabels } from '../../../models/enums';
import { MediaResponseSlim } from '../../../models/media.model';

/**
 * Список фільмів-посилань для сайдбарів (фільми актора, колекції): клік веде на /movies/:id.
 * Стилі (.actors-section, .actor-row, .movie-thumb) глобальні — у styles.scss.
 */
@Component({
    selector: 'app-media-link-list',
    standalone: true,
    imports: [RouterLink],
    template: `
        <div class="actors-section">
            <h4>
                {{ heading() }}
                @if (movies().length > 0) {
                <span class="title-meta">({{ movies().length }})</span>
                }
            </h4>

            @if (movies().length === 0) {
            <p class="detail-row">Фільмів не знайдено.</p>
            } @else {
            <div class="actors-sidebar-list">
                @for (movie of movies(); track movie.id) {
                <a class="actor-row" [routerLink]="['/movies', movie.id]" [title]="'Відкрити: ' + movie.title">
                    @if (movie.posterUrl) {
                    <img [src]="movie.posterUrl" [alt]="movie.title" class="movie-thumb">
                    } @else {
                    <div class="movie-thumb movie-no-poster">🎬</div>
                    }
                    <div class="actor-info">
                        <span class="actor-name"><strong>{{ movie.title }}</strong>
                            @if (movie.releaseYear) {
                            <span class="title-meta">{{ movie.releaseYear }}</span>
                            }
                        </span>
                        <span class="actor-character">{{ typeLabels[movie.type] }}</span>
                    </div>
                </a>
                }
            </div>
            }
        </div>
    `
})
export class MediaLinkListComponent {
    readonly movies = input<MediaResponseSlim[]>([]);
    readonly heading = input('Фільми');

    readonly typeLabels = MediaTypeLabels;
}