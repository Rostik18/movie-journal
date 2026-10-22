import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateMediaCollectionRequest, MediaCollectionResponse } from '../models/collection.model';
import { PageResponse } from '../models/shared.model';
import { CollectionSearchParams } from '../models/search.model';

@Injectable({
    providedIn: 'root'
})
export class CollectionService {
    private apiUrl = `${environment.apiUrl}/api/collections`;
    private http = inject(HttpClient);

    searchCollections(params: CollectionSearchParams = {}): Observable<PageResponse<MediaCollectionResponse>> {
        let httpParams = new HttpParams();

        if (params.query) {
            httpParams = httpParams.set('query', params.query);
        }
        if (params.tag) {
            httpParams = httpParams.set('tag', params.tag);
        }
        if (params.visibility !== undefined && params.visibility !== null) {
            httpParams = httpParams.set('visibility', params.visibility.toString());
        }
        if (params.ownerUserId) {
            httpParams = httpParams.set('ownerUserId', params.ownerUserId);
        }
        if (params.hasPoster !== undefined && params.hasPoster !== null) {
            httpParams = httpParams.set('hasPoster', params.hasPoster.toString());
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

        return this.http.get<PageResponse<MediaCollectionResponse>>(`${this.apiUrl}/search`, { params: httpParams });
    }

    getCollectionById(id: string): Observable<MediaCollectionResponse> {
        return this.http.get<MediaCollectionResponse>(`${this.apiUrl}/${id}`);
    }

    createCollection(request: CreateMediaCollectionRequest): Observable<MediaCollectionResponse> {
        return this.http.post<MediaCollectionResponse>(this.apiUrl, request);
    }

    deleteCollection(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}