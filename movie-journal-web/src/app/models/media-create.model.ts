import { MediaType, MediaLinkType, Visibility } from './enums';

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
    collectionId?: string | null;
}