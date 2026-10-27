import { Visibility, WatchStatus } from './enums';
import { MediaItem, MediaResponseSlim, MediaSidebar } from './media.model';

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

/** Відповідь GET /api/user-watching/media/{id}/sidebar: запис списку разом з повним медіа. */
export interface UserWatchingSidebar extends Omit<UserWatchingItem, 'media'> {
    media: MediaSidebar;
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