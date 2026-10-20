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
        return this.http.post<string>(`${this.apiUrl}/seed`, request, { responseType: 'text' });
    }
}