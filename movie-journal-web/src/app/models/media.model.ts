import { MediaType } from "./enums";

export interface MediaItem {
    id: string;
    title: string;
    originalTitle: string;
    type: MediaType;
    releaseYear: number;
    posterUrl: string;
    genres: string[];
    tags: string[];
}