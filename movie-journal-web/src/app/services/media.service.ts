import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaItem, CreateMediaRequest } from '../models/media.model';
import { PageResponse } from '../models/shared.model';
import { MediaSearchParams } from '../models/search.model';

@Injectable({
    providedIn: 'root'
})
export class MediaService {
    private apiUrl = `${environment.apiUrl}/api/media`;
    private http = inject(HttpClient);

    // Оновлений метод пошуку з підтримкою query-параметрів
    searchMedia(params: MediaSearchParams = {}): Observable<PageResponse<MediaItem>> {
        let httpParams = new HttpParams();

        if (params.query) {
            httpParams = httpParams.set('query', params.query);
        }
        if (params.type) {
            httpParams = httpParams.set('type', params.type);
        }
        if (params.visibility !== undefined && params.visibility !== null) {
            httpParams = httpParams.set('visibility', params.visibility.toString());
        }
        if (params.releaseYear !== undefined && params.releaseYear !== null) {
            httpParams = httpParams.set('releaseYear', params.releaseYear.toString());
        }
        if (params.genre) {
            httpParams = httpParams.set('genre', params.genre);
        }
        if (params.tag) {
            httpParams = httpParams.set('tag', params.tag);
        }
        if (params.collectionId) {
            httpParams = httpParams.set('collectionId', params.collectionId);
        }
        if (params.actorId) {
            httpParams = httpParams.set('actorId', params.actorId);
        }
        if (params.author) {
            httpParams = httpParams.set('author', params.author);
        }
        if (params.sortBy !== undefined && params.sortBy !== null) {
            httpParams = httpParams.set('sortBy', params.sortBy.toString());
        }
        if (params.sort) {
            httpParams = httpParams.set('sort', params.sort);
        }
        if (params.offset !== undefined && params.offset !== null) {
            httpParams = httpParams.set('offset', params.offset.toString());
        }
        if (params.size !== undefined && params.size !== null) {
            httpParams = httpParams.set('size', params.size.toString());
        }

        return this.http.get<PageResponse<MediaItem>>(`${this.apiUrl}/search`, { params: httpParams });
    }

    getMediaById(id: string): Observable<MediaItem> {
        return this.http.get<MediaItem>(`${this.apiUrl}/${id}`);
    }

    createMedia(request: CreateMediaRequest): Observable<MediaItem> {
        return this.http.post<MediaItem>(`${this.apiUrl}`, request);
    }

    deleteMedia(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}