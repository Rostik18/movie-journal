import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EMPTY, timer } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';

import { UserResponse } from '../../models/user.model';
import { ToastComponent } from '../shared/toast/toast.component';
import { ServerService } from '../../services/server.service';
import { ServerHealth, ServerHealthService } from '../../services/server-health.service';
import { UserService } from '../../services/user.service';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const DEFAULT_USER_NAME = 'Користувач';
const HEARTBEAT_INTERVAL_MS = 300_000;

const STATUS_LABELS: Record<ServerHealth, string> = {
    green: 'активний',
    yellow: 'невідомо',
    red: 'недоступний'
};

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
    templateUrl: './main-layout.component.html',
    styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
    private readonly router = inject(Router);
    private readonly serverService = inject(ServerService);
    private readonly serverHealth = inject(ServerHealthService);
    private readonly userService = inject(UserService);

    readonly navItems = [
        { path: '/watchlist', label: '⭐ Список перегляду', render: true },
        { path: '/movies', label: 'Список фільмів', render: true },
        { path: '/actors', label: 'Актори', render: true },
        { path: '/collections', label: 'Колекції', render: true },
        { path: '/users', label: 'Користувачі', render: this.userService.isAdmin() },
        { path: '/seed-data', label: 'Seed Data', render: this.userService.isAdmin() }
    ];

    readonly serverStatus = this.serverHealth.status;
    readonly statusLabel = computed(() => STATUS_LABELS[this.serverStatus()]);

    /** Читається один раз, а не на кожен цикл change detection. */
    readonly userName = this.readUserName();

    constructor() {
        // Heartbeat: перший пінг одразу, далі раз на хвилину. Поки перша відповідь не прийшла,
        // статус «невідомо». Результат записує інтерцептор, тому помилки тут ігноруємо.
        // exhaustMap не накладає пінги один на одного, takeUntilDestroyed зупиняє їх після виходу.
        timer(0, HEARTBEAT_INTERVAL_MS).pipe(
            exhaustMap(() => this.serverService.pingStatusEndpoint().pipe(catchError(() => EMPTY))),
            takeUntilDestroyed()
        ).subscribe();
    }

    logout(): void {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        this.router.navigate(['/login'], { replaceUrl: true });
    }

    private readUserName(): string {
        try {
            const userJson = localStorage.getItem(AUTH_USER_KEY);
            if (userJson) {
                const user = JSON.parse(userJson) as Partial<UserResponse>;
                return user.displayName || user.login || DEFAULT_USER_NAME;
            }
        } catch {
            // Пошкоджений JSON у localStorage не повинен ламати весь layout
        }
        return DEFAULT_USER_NAME;
    }
}