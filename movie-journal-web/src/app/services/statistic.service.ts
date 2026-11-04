import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActorsStatisticResponse, MediaStatisticResponse, UserWatchingStatisticResponse } from '../models/statistic.model';

@Injectable({
    providedIn: 'root'
})
export class StatisticService {
    private apiUrl = `${environment.apiUrl}/api/statistics`;
    private http = inject(HttpClient);

    /** @param ageGap розмір вікової групи в роках (ключі countByAge — початок групи); без значення бекенд бере свій за замовчуванням. */
    getActorsStatistics(ageGap?: number): Observable<ActorsStatisticResponse> {
        let params = new HttpParams();
        if (ageGap !== undefined) {
            params = params.set('ageGap', ageGap.toString());
        }
        return this.http.get<ActorsStatisticResponse>(`${this.apiUrl}/actors`, { params });
    }

    getMediaStatistics(): Observable<MediaStatisticResponse> {
        return this.http.get<MediaStatisticResponse>(`${this.apiUrl}/media`);
    }

    getUserWatchingStatistics(): Observable<UserWatchingStatisticResponse> {
        return this.http.get<UserWatchingStatisticResponse>(`${this.apiUrl}/user-watching`);
    }
}