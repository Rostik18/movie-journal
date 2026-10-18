import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { interval } from 'rxjs';

export interface MetadataResponse {
    title?: string | null;
    description?: string | null;
    image?: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ServerService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/service`;

    // Час останнього успішного запиту (в мілісекундах)
    private lastActivityTime = signal<number>(Date.now());

    // Прапорець, чи була остання помилка 500
    private hasServerFailed = signal<boolean>(false);

    // Технічний сигнал для оновлення часу кожні 10 секунд (щоб тривалість перераховувалася)
    private timeTick = signal<number>(Date.now());

    constructor() {
        // Запускаємо фоновий таймер для оновлення часу
        interval(10000).subscribe(() => {
            this.timeTick.set(Date.now());
        });
    }

    // Обчислюємо статус на основі правил
    serverStatus = computed(() => {
        // Використовуємо timeTick, щоб сигнал перераховувався
        this.timeTick();

        const now = Date.now();
        const diffMinutes = (now - this.lastActivityTime()) / (1000 * 60);

        if (this.hasServerFailed()) {
            return 'red'; // Помилка 500
        }
        if (diffMinutes < 5) {
            return 'green'; // Менше 5 хв
        }
        if (diffMinutes <= 15) {
            return 'yellow'; // Від 5 до 15 хв
        }
        return 'red'; // Більше 15 хв без активності
    });

    // Методи для оновлення стану з інтерцептора
    recordSuccess() {
        this.lastActivityTime.set(Date.now());
        this.hasServerFailed.set(false);
    }

    recordError(status: number) {
        if (status === 500) {
            this.hasServerFailed.set(true);
        }
    }

    // Метод для примусового пінгу вашого ендпоінту /api/service/status
    pingStatusEndpoint() {
        return this.http.get(`${this.apiUrl}/status`);
    }

    getMetadata(url: string): Observable<MetadataResponse> {
        const params = new HttpParams().set('url', url);
        return this.http.get<MetadataResponse>(`${this.apiUrl}/metadata`, { params });
    }
}