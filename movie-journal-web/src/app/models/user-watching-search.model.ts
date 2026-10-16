import { WatchStatus, MediaType } from './enums';
import { SortDirection } from './shared.model';

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