import { Visibility } from './enums';
import { MediaResponseSlim } from './media.model';

export interface MediaCollectionResponse {
    id: string;
    name: string;
    description?: string | null;
    posterUrl?: string | null;
    tags: string[];
    visibility: Visibility;
}

/** Відповідь GET /api/collections/{id}/sidebar: колекція разом зі списком її фільмів. */
export interface CollectionSidebar extends MediaCollectionResponse {
    media: MediaResponseSlim[];
}

export interface CreateMediaCollectionRequest {
    name: string;
    description?: string | null;
    posterUrl?: string | null;
    tags: string[];
    visibility: Visibility;
}

export interface UpdateMediaCollectionRequest {
    collectionId: string;
    name?: string | null;
    description?: string | null;
    posterUrl?: string | null;
    tags?: string[] | null;
    visibility?: Visibility | null;
}