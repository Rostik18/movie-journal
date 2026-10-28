import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActorsStatisticResponse } from '../models/statistic.model';

@Injectable({
    providedIn: 'root'
})
export class StatisticService {
    private apiUrl = `${environment.apiUrl}/api/statistics`;
    private http = inject(HttpClient);

    getActorsStatistics(): Observable<ActorsStatisticResponse> {
        return this.http.get<ActorsStatisticResponse>(`${this.apiUrl}/actors`);
    }
}