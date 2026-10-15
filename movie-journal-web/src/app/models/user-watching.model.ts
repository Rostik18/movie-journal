import { MediaType, WatchStatus } from './enums';

export interface UserWatchingItem {
    mediaId: string;
    title: string;
    type: MediaType;
    status: WatchStatus;
    stoppedAtSeconds: number | null;
    rating: number | null;
    notes: string | null;
    startedAtUtc: string | null;
    finishedAtUtc: string | null;
    currentSeasonNumber: number | null;
    currentEpisodeNumber: number | null;
}
