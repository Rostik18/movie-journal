import { WatchStatus } from './enums';
import { MediaItem } from './media.model'; // Використовуємо вже готову модель медіа

export interface UserWatchingItem {
    media: MediaItem; // Тепер тут повноцінний об'єкт медіа
    status: WatchStatus;
    stoppedAtSeconds: number | null;
    rating: number | null;
    notes: string | null;
    startedAtUtc: string | null;
    finishedAtUtc: string | null;
    currentSeasonNumber: number | null;
    currentEpisodeNumber: number | null;
}