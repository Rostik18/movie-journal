import { ChangeDetectionStrategy, Component, computed, inject, signal, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EMPTY, timer } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { ToastComponent } from '../shared/toast/toast.component';
import { ServerService } from '../../services/server.service';
import { ServerHealth, ServerHealthService } from '../../services/server-health.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

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
    styleUrls: ['./main-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
    private readonly router = inject(Router);
    private readonly serverService = inject(ServerService);
    private readonly serverHealth = inject(ServerHealthService);
    readonly userService = inject(UserService);
    private readonly authService = inject(AuthService);

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

    readonly userName = computed(() => {
        const u = this.userService.currentUser();
        return u?.displayName || u?.login || DEFAULT_USER_NAME;
    });

    // Стан відкриття дропдауну користувача
    readonly isUserDropdownOpen = signal(false);

    constructor() {
        timer(0, HEARTBEAT_INTERVAL_MS).pipe(
            exhaustMap(() => this.serverService.pingStatusEndpoint().pipe(catchError(() => EMPTY))),
            takeUntilDestroyed()
        ).subscribe();
    }

    toggleUserDropdown(event: MouseEvent): void {
        event.stopPropagation();
        this.isUserDropdownOpen.update(v => !v);
    }

    @HostListener('document:click')
    onDocumentClick(): void {
        if (this.isUserDropdownOpen()) {
            this.isUserDropdownOpen.set(false);
        }
    }

    goToProfile(): void {
        this.isUserDropdownOpen.set(false);
        this.router.navigate(['/profile']);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login'], { replaceUrl: true });
    }
}