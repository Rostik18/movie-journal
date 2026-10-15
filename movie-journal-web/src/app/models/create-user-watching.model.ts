import { WatchStatus } from './enums';

export interface CreateUserWatchingRequest {
    mediaId: string;
    status: WatchStatus;
    rating?: number | null;
    notes?: string | null;
    stoppedAtSeconds?: number | null;
    currentSeasonNumber?: number | null;
    currentEpisodeNumber?: number | null;
}