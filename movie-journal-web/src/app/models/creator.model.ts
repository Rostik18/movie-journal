import { Visibility } from './enums';
import { MediaResponseSlim } from './media.model';

export interface CreatorResponse {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    visibility: Visibility;
}

/** Відповідь GET /api/creators/{id}/sidebar: творець разом зі списком його фільмів. */
export interface CreatorSidebar extends CreatorResponse {
    media: MediaResponseSlim[];
}

export interface CreateCreatorRequest {
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    visibility: Visibility;
}

export interface UpdateCreatorRequest {
    creatorId: string;
    name?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    visibility?: Visibility | null;
}