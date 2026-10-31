import { MediaType, Visibility } from "./enums";
import { MediaCollectionResponse } from "./collection.model";
import { SeriesResponse } from "./series.model";

export interface MediaItem {
    id: string;
    title: string;
    description: string;
    originalTitle: string;
    type: MediaType;
    releaseYear: number | null;
    duration: number | null;
    posterUrl: string;
    creator?: MediaCreator | null;
    genres: string[];
    tags: string[];
    links: string[];
    /** У звичайній відповіді склад короткий (без фото); повний — у MediaSidebar. */
    cast: MediaActor[];
    /** Колекція, до якої належить медіа. */
    collection?: CollectionReference | null;
    visibility: Visibility;
    episodeInfo?: EpisodeInfo | null;
}

/** Відповідь GET /api/media/{id}/sidebar: усе для сайдбару одним запитом (склад з фото, повна колекція). */
export interface MediaSidebar extends Omit<MediaItem, 'cast' | 'collection'> {
    cast: CastResponse[];
    collection?: MediaCollectionResponse | null;
    series?: SeriesResponse | null;
}

/** Автор / творець медіа (канал, режисер тощо). */
export interface MediaCreator {
    id: string;
    name: string;
}

export interface MediaResponseSlim {
    id: string;
    title: string;
    type: MediaType;
    releaseYear: number | null;
    duration: number | null;
    posterUrl: string | null;
    genres: string[];
    links: string[];
    visibility: Visibility;
}

/** Посилання на колекцію у відповіді BE: id та назва (додаткові запити не потрібні). */
export interface CollectionReference {
    id: string;
    name: string;
}

/** Актор у складі медіа (відповідь BE): дані актора вже вбудовані, додаткові запити не потрібні. */
export interface CastResponse {
    id: string;
    fullName: string;
    alias?: string | null;
    photoUrl?: string | null;
    characterName?: string | null;
}

/** Елемент складу в запитах створення / оновлення медіа. */
export interface MediaActor {
    actorId: string;
    fullName: string;
    characterName?: string | null;
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
    description?: string | null;
    originalTitle?: string | null;
    type: MediaType;
    releaseYear: number | null;
    duration?: number | null; // у секундах
    posterUrl?: string | null;
    visibility: Visibility;
    genres: string[];
    tags: string[];
    links: string[];
    cast: MediaActor[];
    seasons: Season[];
    creatorId?: string | null;
    collectionId?: string | null;
    episode?: EpisodeInfo | null;
}

export interface UpdateMediaRequest {
    mediaId: string;
    title?: string | null;
    type?: MediaType | null;
    description?: string | null;
    originalTitle?: string | null;
    releaseYear?: number | null;
    duration?: number | null; // у секундах
    posterUrl?: string | null;
    visibility?: Visibility | null;
    genres?: string[] | null;
    tags?: string[] | null;
    links?: string[] | null;
    cast?: MediaActor[] | null;
    seasons?: Season[] | null;
    creatorId?: string | null;
    collectionId?: string | null;
    episode?: EpisodeInfo | null;
}

export interface EpisodeInfo {
    seriesId: string;
    season?: number | null;
    episode?: number | null;
}