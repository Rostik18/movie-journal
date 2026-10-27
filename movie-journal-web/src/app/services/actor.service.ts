import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActorItem, ActorSidebar, UpdateActorRequest } from '../models/actor.model';
import { PageResponse } from '../models/shared.model';
import { environment } from '../../environments/environment';
import { CreateActorRequest } from '../models/actor.model';
import { ActorSearchParams } from '../models/search.model';

@Injectable({
    providedIn: 'root'
})
export class ActorService {
    private apiUrl = `${environment.apiUrl}/api/actors`;
    private http = inject(HttpClient);

    searchActors(params: ActorSearchParams = {}): Observable<PageResponse<ActorItem>> {
        let httpParams = new HttpParams();

        if (params.query) {
            httpParams = httpParams.set('query', params.query);
        }
        if (params.birthYear !== undefined && params.birthYear !== null) {
            httpParams = httpParams.set('birthYear', params.birthYear.toString());
        }
        if (params.hasPhoto !== undefined && params.hasPhoto !== null) {
            httpParams = httpParams.set('hasPhoto', params.hasPhoto.toString());
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
        if (params.visibility !== undefined && params.visibility !== null) {
            httpParams = httpParams.set('visibility', params.visibility.toString());
        }
        if (params.Sex !== undefined && params.Sex !== null) {
            httpParams = httpParams.set('sex', params.Sex.toString());
        }
        if (params.nationality) {
            httpParams = httpParams.set('nationality', params.nationality);
        }

        return this.http.get<PageResponse<ActorItem>>(`${this.apiUrl}/search`, { params: httpParams });
    }

    /** Коди країн (ISO alpha-3), які зустрічаються в акторів, — для фільтра. */
    getCountryCodes(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/country-codes`);
    }

    /** Актор разом зі списком фільмів — для сайдбару. */
    getActorSidebar(id: string): Observable<ActorSidebar> {
        return this.http.get<ActorSidebar>(`${this.apiUrl}/${id}/sidebar`);
    }

    getActorById(id: string): Observable<ActorItem> {
        return this.http.get<ActorItem>(`${this.apiUrl}/${id}`);
    }

    createActor(request: CreateActorRequest): Observable<ActorItem> {
        return this.http.post<ActorItem>(`${this.apiUrl}`, request);
    }

    updateActor(request: UpdateActorRequest): Observable<ActorItem> {
        return this.http.put<ActorItem>(this.apiUrl, request);
    }

    deleteActor(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}