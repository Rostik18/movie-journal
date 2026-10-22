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