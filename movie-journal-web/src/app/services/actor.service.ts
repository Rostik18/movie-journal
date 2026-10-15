import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/pagination.model';
import { ActorItem } from '../models/actor.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ActorService {
    private apiUrl = `${environment.apiUrl}/api/actors/search`;
    private http = inject(HttpClient);

    searchActors(): Observable<PageResponse<ActorItem>> {
        return this.http.get<PageResponse<ActorItem>>(this.apiUrl);
    }
}