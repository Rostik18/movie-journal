import { MediaType, WatchStatus } from './enums';
import { MediaItem } from './media.model'; // Використовуємо вже готову модель медіа
import { SortDirection } from './shared.model';

export interface UserWatchingItem {
    media: MediaItem;
    status: WatchStatus;
    stoppedAtSeconds: number | null;
    rating: number | null;
    notes: string | null;
    startedAtUtc: string | null;
    finishedAtUtc: string | null;
    currentSeasonNumber: number | null;
    currentEpisodeNumber: number | null;
}

export enum UserWatchingSortField {
    Title = 'Title',
    Status = 'Status',
    Rating = 'Rating',
    StartedAt = 'StartedAt',
    FinishedAt = 'FinishedAt',
    CreatedAt = 'CreatedAt',
    UpdatedAt = 'UpdatedAt'
}

export interface UserWatchingSearchParams {
    query?: string;
    mediaId?: string;
    status?: WatchStatus;
    type?: MediaType;
    minRating?: number;
    maxRating?: number;
    hasRating?: boolean;
    hasNotes?: boolean;
    startedFromUtc?: string; // ISO рядок дати
    startedToUtc?: string;
    finishedFromUtc?: string;
    finishedToUtc?: string;
    sortBy?: UserWatchingSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
}