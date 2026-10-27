import { Visibility } from './enums';

export interface CreatorResponse {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    visibility: Visibility;
}

export interface CreateCreatorRequest {
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    visibility: Visibility;
}

export interface UpdateCreatorRequest {
    CreatorId: string;
    name?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    visibility?: Visibility | null;
}