import { Visibility } from './enums';
import { SortDirection } from './shared.model';

export enum MediaCollectionSortField {
    Name = 1
}

export interface CollectionSearchParams {
    query?: string;
    tag?: string;
    visibility?: Visibility;
    ownerUserId?: string;
    hasPoster?: boolean;
    sortBy?: MediaCollectionSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
}

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