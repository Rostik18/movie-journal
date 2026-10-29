import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Season } from '../../../models/media.model';

/** Сезони та епізоди серіалу (при створенні медіа). Змінюється лише імутабельно, тож працює як двостороння прив'язка. */
@Component({
    selector: 'app-seasons-editor',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './seasons-editor.component.html',
    styleUrls: ['./seasons-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonsEditorComponent {
    readonly seasons = model<Season[]>([]);

    addSeason(): void {
        this.seasons.update(list => [...list, { number: list.length + 1, episodes: [] }]);
    }

    removeSeason(index: number): void {
        this.seasons.update(list => list
            .filter((_, i) => i !== index)
            .map((season, i) => ({ ...season, number: i + 1 })));
    }

    addEpisode(seasonIndex: number): void {
        this.updateSeason(seasonIndex, season => ({
            ...season,
            episodes: [...season.episodes, { number: season.episodes.length + 1, title: '' }]
        }));
    }

    removeEpisode(seasonIndex: number, episodeIndex: number): void {
        this.updateSeason(seasonIndex, season => ({
            ...season,
            episodes: season.episodes
                .filter((_, i) => i !== episodeIndex)
                .map((episode, i) => ({ ...episode, number: i + 1 }))
        }));
    }

    setEpisodeTitle(seasonIndex: number, episodeIndex: number, title: string): void {
        this.updateSeason(seasonIndex, season => ({
            ...season,
            episodes: season.episodes.map((episode, i) => (i === episodeIndex ? { ...episode, title } : episode))
        }));
    }

    private updateSeason(index: number, change: (season: Season) => Season): void {
        this.seasons.update(list => list.map((season, i) => (i === index ? change(season) : season)));
    }
}