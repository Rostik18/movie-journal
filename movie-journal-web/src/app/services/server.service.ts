import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Visibility, WatchStatus, MediaType, MediaLinkType } from '../models/enums';

export interface MetadataResponse {
    title?: string | null;
    description?: string | null;
    image?: string | null;
    durationSeconds?: number | null;
    author?: string | null;
    mediaType?: MediaType | null;
    tags?: string[] | null;
}

export interface SeedRequest {
    userId?: string | null;
    visibility: Visibility;
    status: WatchStatus;
    type: MediaType;
    mediaLinkType: MediaLinkType;
    tags: string[];
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

    seedData(request: SeedRequest): Observable<string> {
        return this.http.post<string>(`${this.apiUrl}/seed`, request, { responseType: 'text' as 'json' });
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