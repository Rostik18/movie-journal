import { Sex, Visibility } from "./enums";
import { MediaResponseSlim } from "./media.model";

export interface ActorItem {
    id: string;
    fullName: string;
    /** Псевдонім / сценічне ім'я. */
    alias?: string | null;
    birthDate: string | null;
    biography: string | null;
    photoUrl: string | null;
    visibility: Visibility;
    sex?: Sex | null;
    /** ISO 3166-1 alpha-3 коди громадянств: ['USA'], ['NLD', 'FRA']. */
    nationalities: string[];
}

/** Відповідь GET /api/actors/{id}/sidebar: актор разом зі списком його фільмів. */
export interface ActorSidebar extends ActorItem {
    media: MediaResponseSlim[];
}

export interface CreateActorRequest {
    fullName: string;
    alias?: string | null;
    birthDate?: string | null; // у форматі дати (рядок або Date)
    biography?: string | null;
    photoUrl?: string | null;
    visibility: Visibility;
    sex?: Sex | null;
    nationalities: string[];
}

export interface UpdateActorRequest {
    actorId: string;
    fullName?: string | null;
    alias?: string | null;
    birthDate?: string | null;
    biography?: string | null;
    photoUrl?: string | null;
    visibility?: Visibility | null;
    sex?: Sex | null;
    /** Не nullable на BE: завжди надсилаємо актуальний список (порожній — без громадянств). */
    nationalities: string[];
}