import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CreateCreatorRequest, CreatorResponse } from '../models/creator.model';
import { PageResponse } from '../models/shared.model';

@Injectable({
    providedIn: 'root'
})
export class CreatorService {
    private apiUrl = `${environment.apiUrl}/api/creators`;
    private http = inject(HttpClient);

    searchCreators(params: { query?: string; size?: number; offset?: number } = {}): Observable<PageResponse<CreatorResponse>> {
        let httpParams = new HttpParams();

        if (params.query) {
            httpParams = httpParams.set('query', params.query);
        }
        if (params.offset !== undefined) {
            httpParams = httpParams.set('offset', params.offset.toString());
        }
        if (params.size !== undefined) {
            httpParams = httpParams.set('size', params.size.toString());
        }

        return this.http.get<PageResponse<CreatorResponse>>(`${this.apiUrl}/search`, { params: httpParams });
    }

    createCreator(request: CreateCreatorRequest): Observable<CreatorResponse> {
        return this.http.post<CreatorResponse>(this.apiUrl, request);
    }
}