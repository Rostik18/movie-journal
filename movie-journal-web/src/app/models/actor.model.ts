import { Visibility } from "./enums";
import { SortDirection } from "./shared.model";

export interface ActorItem {
    id: string;
    fullName: string;
    birthDate: string | null;
    biography: string | null;
    photoUrl: string | null;
    visibility: Visibility;
}

export enum ActorSortField {
    FullName = 1,
    BirthDate = 2,
    CreatedAt = 3,
    UpdatedAt = 4
}

export interface ActorSearchParams {
    name?: string;
    birthYear?: number;
    hasPhoto?: boolean;
    sortBy?: ActorSortField;
    sort?: SortDirection;
    offset?: number;
    size?: number;
}

export interface CreateActorRequest {
    fullName: string;
    birthDate?: string | null; // у форматі дати (рядок або Date)
    biography?: string | null;
    photoUrl?: string | null;
    visibility: Visibility;
}
