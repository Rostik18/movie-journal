import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/pagination.model';
import { UserWatchingItem } from '../models/user-watching.model';
import { CreateUserWatchingRequest } from '../models/create-user-watching.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UserWatchingService {
    private baseUrl = `${environment.apiUrl}/api/user-watching`;
    private http = inject(HttpClient);

    getUserWatchingList(): Observable<PageResponse<UserWatchingItem>> {
        return this.http.get<PageResponse<UserWatchingItem>>(`${this.baseUrl}/search`);
    }

    addToWatchlist(request: CreateUserWatchingRequest): Observable<UserWatchingItem> {
        return this.http.post<UserWatchingItem>(`${this.baseUrl}/`, request);
    }
}