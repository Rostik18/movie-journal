import { Visibility } from './enums';

export interface MediaCollectionResponse {
    id: string;
    name: string;
    posterUrl?: string | null;
    tags: string[];
    visibility: Visibility;
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