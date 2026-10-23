import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserWatchingItem, UserWatchingResponseSlim, CreateUserWatchingRequest, UpdateUserWatchingRequest } from '../models/user-watching.model';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/shared.model';
import { UserWatchingSearchParams } from '../models/search.model';

@Injectable({
    providedIn: 'root'
})
export class UserWatchingService {
    private baseUrl = `${environment.apiUrl}/api/user-watching`;
    private http = inject(HttpClient);

    getById(id: string): Observable<UserWatchingItem> {
        return this.http.get<UserWatchingItem>(`${this.baseUrl}/${id}`);
    }

    searchUserWatchingList(params: UserWatchingSearchParams = {}): Observable<PageResponse<UserWatchingResponseSlim>> {
        let httpParams = new HttpParams();

        if (params.query) {
            httpParams = httpParams.set('query', params.query);
        }
        if (params.mediaId) {
            httpParams = httpParams.set('mediaId', params.mediaId);
        }
        if (params.status !== undefined && params.status !== null) {
            httpParams = httpParams.set('status', params.status.toString());
        }
        if (params.type) {
            httpParams = httpParams.set('type', params.type);
        }
        if (params.minRating !== undefined && params.minRating !== null) {
            httpParams = httpParams.set('minRating', params.minRating.toString());
        }
        if (params.maxRating !== undefined && params.maxRating !== null) {
            httpParams = httpParams.set('maxRating', params.maxRating.toString());
        }
        if (params.hasRating !== undefined && params.hasRating !== null) {
            httpParams = httpParams.set('hasRating', params.hasRating.toString());
        }
        if (params.hasNotes !== undefined && params.hasNotes !== null) {
            httpParams = httpParams.set('hasNotes', params.hasNotes.toString());
        }
        if (params.startedFromUtc) {
            httpParams = httpParams.set('startedFromUtc', params.startedFromUtc);
        }
        if (params.startedToUtc) {
            httpParams = httpParams.set('startedToUtc', params.startedToUtc);
        }
        if (params.finishedFromUtc) {
            httpParams = httpParams.set('finishedFromUtc', params.finishedFromUtc);
        }
        if (params.finishedToUtc) {
            httpParams = httpParams.set('finishedToUtc', params.finishedToUtc);
        }
        if (params.sortBy) {
            httpParams = httpParams.set('sortBy', params.sortBy);
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
        if (params.visibility !== undefined && params.visibility !== null) {
            httpParams = httpParams.set('visibility', params.visibility.toString());
        }

        return this.http.get<PageResponse<UserWatchingResponseSlim>>(`${this.baseUrl}/search`, { params: httpParams });
    }

    createOrUpdateWatchlist(request: CreateUserWatchingRequest): Observable<UserWatchingItem> {
        return this.http.post<UserWatchingItem>(this.baseUrl, request);
    }

    updateWatchlist(request: UpdateUserWatchingRequest): Observable<UserWatchingItem> {
        return this.http.put<UserWatchingItem>(this.baseUrl, request);
    }

    deleteUserWatching(id: string): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/media/${id}`);
    }
}