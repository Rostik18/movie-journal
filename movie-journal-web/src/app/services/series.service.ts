import { Injectable, inject } from '@angular/core';
import { HttpContext, HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/shared.model';
import { SeriesSearchParams } from '../models/search.model';
import { CreateSeriesRequest, UpdateSeriesRequest, SeriesResponse, SeriesResponseSb } from '../models/series.model';

@Injectable({
    providedIn: 'root'
})
export class SeriesService {
    private apiUrl = `${environment.apiUrl}/api/series`;
    private http = inject(HttpClient);

    searchSeries(params: SeriesSearchParams = {}, context?: HttpContext): Observable<PageResponse<SeriesResponse>> {
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

        return this.http.get<PageResponse<SeriesResponse>>(`${this.apiUrl}/search`, { params: httpParams, context });
    }

    getSeriesById(id: string): Observable<SeriesResponse> {
        return this.http.get<SeriesResponse>(`${this.apiUrl}/${id}`);
    }

    getSeriesSidebar(id: string): Observable<SeriesResponseSb> {
        return this.http.get<SeriesResponseSb>(`${this.apiUrl}/${id}/sidebar`);
    }

    createSeries(request: CreateSeriesRequest, context?: HttpContext): Observable<SeriesResponse> {
        return this.http.post<SeriesResponse>(this.apiUrl, request, { context });
    }

    updateSeries(request: UpdateSeriesRequest): Observable<SeriesResponse> {
        return this.http.put<SeriesResponse>(this.apiUrl, request);
    }

    deleteSeries(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}