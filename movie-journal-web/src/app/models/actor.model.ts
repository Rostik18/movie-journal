import { Sex, Visibility } from "./enums";

export interface ActorItem {
    id: string;
    fullName: string;
    birthDate: string | null;
    biography: string | null;
    photoUrl: string | null;
    visibility: Visibility;
    sex?: Sex | null;
}

export interface CreateActorRequest {
    fullName: string;
    birthDate?: string | null; // у форматі дати (рядок або Date)
    biography?: string | null;
    photoUrl?: string | null;
    visibility: Visibility;
    sex?: Sex | null;
}

export interface UpdateActorRequest {
    actorId: string;
    fullName?: string | null;
    birthDate?: string | null;
    biography?: string | null;
    photoUrl?: string | null;
    visibility?: Visibility | null;
    sex?: Sex | null;
}
