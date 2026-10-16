import { MediaType, Visibility } from './enums';
import { SortDirection } from './shared.model';

export enum MediaSortField {
    Title = 1,
    ReleaseYear = 2,
    CreatedAt = 3,
    UpdatedAt = 4
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