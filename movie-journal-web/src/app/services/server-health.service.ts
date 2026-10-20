import { Injectable, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

export type ServerHealth = 'green' | 'yellow' | 'red';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const STALE_WINDOW_MS = 15 * 60 * 1000;
const TICK_INTERVAL_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class ServerHealthService {
    /** Час останньої відповіді сервера. null = відповіді ще не було (статус «невідомо»). */
    private readonly lastResponseAt = signal<number | null>(null);

    /** Остання відповідь була збоєм (мережа / 5xx). */
    private readonly hasFailed = signal(false);

    /** Поточний час: оновлюється таймером, щоб статус «старів» без нових запитів. */
    private readonly now = signal(Date.now());

    readonly status = computed<ServerHealth>(() => {
        if (this.hasFailed()) {
            return 'red';
        }

        const last = this.lastResponseAt();
        if (last === null) {
            return 'yellow'; // сервер ще не відповідав: невідомо
        }

        const elapsed = this.now() - last;
        if (elapsed < ACTIVE_WINDOW_MS) {
            return 'green';
        }
        if (elapsed <= STALE_WINDOW_MS) {
            return 'yellow';
        }
        return 'red';
    });

    constructor() {
        interval(TICK_INTERVAL_MS).pipe(takeUntilDestroyed()).subscribe(() => this.now.set(Date.now()));
    }

    /**
     * Реєструє відповідь, яка справді надійшла від сервера.
     * - 0 (немає зв'язку / CORS / таймаут) та 5xx -> сервер недоступний або падає;
     * - будь-яка інша відповідь (навіть 401 чи 404) означає, що сервер живий.
     */
    recordResponse(status: number): void {
        if (status === 0 || status >= 500) {
            this.hasFailed.set(true);
            return;
        }

        const now = Date.now();
        this.now.set(now);
        this.lastResponseAt.set(now);
        this.hasFailed.set(false);
    }
}