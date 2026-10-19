import { MediaLinkType, MediaType, Visibility } from "./enums";
import { SortDirection } from "./shared.model";

export interface MediaItem {
    id: string;
    title: string;
    description: string;
    originalTitle: string;
    type: MediaType;
    releaseYear: number;
    posterUrl: string;
    genres: string[];
    tags: string[];
    author?: string;
    visibility: Visibility;
}

export interface MediaActor {
    actorId: string;
    fullName: string;
    characterName?: string | null;
}

export interface MediaLink {
    name?: string | null;
    url: string;
    type: MediaLinkType;
}

export interface Episode {
    number: number;
    title?: string | null;
}

export interface Season {
    number: number;
    episodes: Episode[];
}

export interface CreateMediaRequest {
    title: string;
    originalTitle?: string | null;
    type: MediaType;
    releaseYear: number;
    runtimeMinutes?: number | null;
    posterUrl?: string | null;
    visibility: Visibility;
    genres: string[];
    tags: string[];
    cast: MediaActor[];
    links: MediaLink[];
    seasons: Season[];
    author?: string | null;
    collectionId?: string | null;
}

export enum MediaSortField {
    Title = 1,
    Author = 2,
    ReleaseYear = 3,
    CreatedAt = 4,
    UpdatedAt = 5
}

export interface MediaSearchParams {
    title?: string;
    type?: MediaType;
    visibility?: Visibility;
    releaseYear?: number;
    genre?: string;
    tag?: string;
    collectionId?: string;
    actorId?: string;
    author?: string;
    sortBy?: MediaSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
}