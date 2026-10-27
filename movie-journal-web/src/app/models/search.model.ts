import { MediaType, Sex, UserRole, Visibility, WatchStatus } from './enums';

export enum SortDirection {
    Ascending = 'Ascending',
    Descending = 'Descending'
}

export enum ActorSortField {
    FullName = 'FullName',
    BirthDate = 'BirthDate',
    CreatedAt = 'CreatedAt',
    UpdatedAt = 'UpdatedAt',
    Sex = 'Sex',
    Nationality = 'Nationality'
}

export enum MediaCollectionSortField {
    Name = 'Name'
}

export enum UserWatchingSortField {
    Title = 'Title',
    Status = 'Status',
    Rating = 'Rating',
    StartedAt = 'StartedAt',
    FinishedAt = 'FinishedAt',
    CreatedAt = 'CreatedAt',
    UpdatedAt = 'UpdatedAt'
}

export enum MediaSortField {
    Title = 'Title',
    Creator = 'Creator',
    ReleaseYear = 'ReleaseYear',
    CreatedAt = 'CreatedAt',
    UpdatedAt = 'UpdatedAt'
}

export enum UserSortField {
    Name = 'Name'
}

export interface ActorSearchParams {
    query?: string;
    birthYear?: number;
    hasPhoto?: boolean;
    sortBy?: ActorSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
    visibility?: Visibility;
    Sex?: Sex | null;
    /** ISO alpha-3 код країни. */
    nationality?: string;
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

export interface MediaSearchParams {
    query?: string;
    type?: MediaType;
    visibility?: Visibility;
    releaseYear?: number;
    genre?: string;
    tag?: string;
    collectionId?: string;
    actorId?: string;
    /** Назва автора (пошук за назвою). */
    creator?: string;
    creatorId?: string;
    sortBy?: MediaSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
}

export interface UserWatchingSearchParams {
    query?: string;
    mediaId?: string;
    status?: WatchStatus;
    type?: MediaType;
    minRating?: number;
    maxRating?: number;
    hasRating?: boolean;
    hasNotes?: boolean;
    startedFromUtc?: string; // ISO рядок дати
    startedToUtc?: string;
    finishedFromUtc?: string;
    finishedToUtc?: string;
    sortBy?: UserWatchingSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
    visibility?: Visibility;
}

export interface UserSearchParams {
    name?: string;
    role?: UserRole;
    sortBy?: UserSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
}