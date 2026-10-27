import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Visibility, WatchStatus, MediaType } from '../models/enums';

export interface MetadataResponse {
    title?: string | null;
    description?: string | null;
    image?: string | null;
    durationSeconds?: number | null;
    author?: string | null;
    mediaType?: MediaType | null;
    tags?: string[] | null;
}

export interface SeedUserWatchRequest {
    userId?: string | null;
    visibility: Visibility;
    status: WatchStatus;
    type: MediaType;
    tags: string[];
    author?: string | null;
    payload: string;
    collectionId?: string | null;
}

export interface SeedActorsRequest {
    userId?: string | null;
    visibility: Visibility;
    payload: string;
}

export interface SeedCreatorsRequest {
    userId?: string | null;
    visibility: Visibility;
    payload: string;
}

export interface CollectionRestoreResult {
    collection: string;
    imported: number;
    skipped: number;
}

export interface RestoreResult {
    sourceDatabase: string;
    collections: CollectionRestoreResult[];
    totalImported: number;
    totalSkipped: number;
}

export interface ClearDatabaseResult {
    message: string;
    preservedCollections: string[];
    droppedCollections: string[];
}

export interface UrlNameRateResult {
    url: string;
    name?: string | null;
    rate?: number | null;
}

export interface SeedUserWatchResponse {
    message: string;
    missedLines: UrlNameRateResult[];
}

export interface SeedActorItemResult {
    fullName: string;
    photoUrl?: string | null;
    birthDate?: string | null;
}

export interface SeedActorsResponse {
    message: string;
    missedActors: SeedActorItemResult[];
}

export interface SeedCreatorItemResult {
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
}

export interface SeedCreatorsResponse {
    message: string;
    missedCreators: SeedCreatorItemResult[];
    lastError?: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ServerService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/service`;

    /** Пінг ендпоінту /api/service/status. Результат у статус записує інтерцептор. */
    pingStatusEndpoint(): Observable<unknown> {
        return this.http.get(`${this.apiUrl}/status`);
    }

    getMetadata(url: string): Observable<MetadataResponse> {
        const params = new HttpParams().set('url', url);
        return this.http.get<MetadataResponse>(`${this.apiUrl}/metadata`, { params });
    }

    seedUserWatchData(request: SeedUserWatchRequest): Observable<SeedUserWatchResponse> {
        return this.http.post<SeedUserWatchResponse>(`${this.apiUrl}/seed-user-media`, request);
    }

    seedActorsData(request: SeedActorsRequest): Observable<SeedActorsResponse> {
        return this.http.post<SeedActorsResponse>(`${this.apiUrl}/seed-actors`, request);
    }

    seedCreatorsData(request: SeedCreatorsRequest): Observable<SeedCreatorsResponse> {
        return this.http.post<SeedCreatorsResponse>(`${this.apiUrl}/seed-creators`, request);
    }

    // ==================== Нові ендпоінти бази даних (Admin) ====================

    /** Отримання бекапу бази даних (повертає Blob-файл ZIP) */
    downloadBackup(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/database/backup`, { responseType: 'blob' });
    }

    /** Відновлення бази даних з ZIP-файлу (передає FormData з файлом) */
    restoreBackup(file: File): Observable<RestoreResult> {
        const formData = new FormData();
        formData.append('File', file, file.name);

        return this.http.post<RestoreResult>(`${this.apiUrl}/database/restore`, formData);
    }

    /** Очищення колекцій бази даних */
    clearDatabase(): Observable<ClearDatabaseResult> {
        return this.http.delete<ClearDatabaseResult>(`${this.apiUrl}/database/clear`);
    }
}