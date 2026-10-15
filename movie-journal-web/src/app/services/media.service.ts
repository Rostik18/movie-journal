import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MediaItem } from '../models/media.model';
import { PageResponse } from '../models/pagination.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MediaService {
    private apiUrl = `${environment.apiUrl}/api/media/search`;
    private http = inject(HttpClient);

    searchMedia(): Observable<PageResponse<MediaItem>> {
        // Виконуємо GET запит і вказуємо тип даних, які очікуємо
        return this.http.get<PageResponse<MediaItem>>(this.apiUrl);
    }
}