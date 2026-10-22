import { MediaLinkType, MediaType, Visibility } from "./enums";

export interface MediaItem {
    id: string;
    title: string;
    description: string;
    originalTitle: string;
    type: MediaType;
    releaseYear: number | null;
    duration: number | null;
    posterUrl: string;
    author?: string;
    genres: string[];
    tags: string[];
    links: MediaLink[];
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
    releaseYear: number | null;
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
