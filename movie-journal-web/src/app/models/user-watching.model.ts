import { Visibility, WatchStatus } from './enums';
import { MediaItem, MediaResponseSlim } from './media.model';

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

export interface UserWatchingResponseSlim {
    media: MediaResponseSlim;
    status: WatchStatus;
    rating: number | null;
    notes: string | null;
}

export interface CreateUserWatchingRequest {
    mediaId: string;
    status: WatchStatus;
    rating?: number | null;
    notes?: string | null;
    stoppedAtSeconds?: number | null;
    currentSeasonNumber?: number | null;
    currentEpisodeNumber?: number | null;
}

export interface UpdateUserWatchingRequest {
    mediaId: string;
    status?: WatchStatus | null;
    visibility?: Visibility | null;
    rating?: number | null;
    notes?: string | null;
    stoppedAtSeconds?: number | null;
    currentSeasonNumber?: number | null;
    currentEpisodeNumber?: number | null;
}