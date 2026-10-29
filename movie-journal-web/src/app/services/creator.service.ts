import { Injectable, inject } from '@angular/core';
import { HttpContext, HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CreateCreatorRequest, CreatorResponse, CreatorSidebar, UpdateCreatorRequest } from '../models/creator.model';
import { CreatorSearchParams } from '../models/search.model';
import { PageResponse } from '../models/shared.model';

@Injectable({
    providedIn: 'root'
})
export class CreatorService {
    private apiUrl = `${environment.apiUrl}/api/creators`;
    private http = inject(HttpClient);

    searchCreators(params: CreatorSearchParams = {}, context?: HttpContext): Observable<PageResponse<CreatorResponse>> {
        let httpParams = new HttpParams();

        if (params.query) {
            httpParams = httpParams.set('query', params.query);
        }
        if (params.hasPhoto !== undefined && params.hasPhoto !== null) {
            httpParams = httpParams.set('hasPhoto', params.hasPhoto.toString());
        }
        if (params.visibility !== undefined && params.visibility !== null) {
            httpParams = httpParams.set('visibility', params.visibility.toString());
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

        return this.http.get<PageResponse<CreatorResponse>>(`${this.apiUrl}/search`, { params: httpParams, context });
    }

    getCreatorById(id: string): Observable<CreatorResponse> {
        return this.http.get<CreatorResponse>(`${this.apiUrl}/${id}`);
    }

    /** Творець разом зі списком його фільмів — для сайдбару. */
    getCreatorSidebar(id: string): Observable<CreatorSidebar> {
        return this.http.get<CreatorSidebar>(`${this.apiUrl}/${id}/sidebar`);
    }

    createCreator(request: CreateCreatorRequest, context?: HttpContext): Observable<CreatorResponse> {
        return this.http.post<CreatorResponse>(this.apiUrl, request, { context });
    }

    updateCreator(request: UpdateCreatorRequest): Observable<CreatorResponse> {
        return this.http.put<CreatorResponse>(this.apiUrl, request);
    }

    deleteCreator(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}