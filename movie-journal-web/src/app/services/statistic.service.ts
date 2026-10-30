import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActorsStatisticResponse } from '../models/statistic.model';

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
}