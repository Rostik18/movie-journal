import { Visibility } from "./enums";

export interface ActorItem {
    id: string;
    fullName: string;
    birthDate: string | null;
    biography: string | null;
    photoUrl: string | null;
    visibility: Visibility;
}

export interface CreateActorRequest {
    fullName: string;
    birthDate?: string | null; // у форматі дати (рядок або Date)
    biography?: string | null;
    photoUrl?: string | null;
    visibility: Visibility;
}
