import { Visibility } from "./enums";

export interface CreateSeriesRequest {
    title: string;
    originalTitle?: string | null;
    description?: string | null;
    posterUrl?: string | null;
    visibility: Visibility;
    genres: string[];
    tags: string[];
}

export interface UpdateSeriesRequest {
    seriesId: string;
    title?: string | null;
    originalTitle?: string | null;
    description?: string | null;
    posterUrl?: string | null;
    visibility: Visibility | null;
    genres?: string[] | null;
    tags: string[] | null;
}

export interface SeriesResponse {
    id: string;
    title: string;
    description?: string | null;
    posterUrl?: string | null;
    tags: string[];
    visibility: Visibility;
}

export interface SeriesResponseSb {
    id: string;
    name: string;
    description?: string | null;
    posterUrl?: string | null;
    tags: string[];
    visibility: Visibility;
    episodes: EpisodeResponse[];
}

export interface EpisodeResponse {
    id: string;
    title: string;
    releaseYear?: number | null;
    duration?: number | null;
    posterUrl?: string | null;
    genres: string[];
    links: string[];
    season?: number | null;
    episode?: number | null;
}
