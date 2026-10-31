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
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

/** Стан згортання зберігаємо в localStorage; сховище може бути недоступним (приватний режим) — тоді просто без пам'яті. */
function readSidebarCollapsed(): boolean {
    try {
        return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

function saveSidebarCollapsed(collapsed: boolean): void {
    try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
        // сховище недоступне — стан діє лише до перезавантаження
    }
}

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
        { path: '/watchlist', icon: '⭐', label: 'Список перегляду', render: true },
        { path: '/movies', icon: '🎞️', label: 'Каталог фільмів', render: true },
        { path: '/actors', icon: '🎭', label: 'Актори', render: true },
        { path: '/collections', icon: '🗂️', label: 'Колекції', render: true },
        { path: '/series', icon: '📺', label: 'Серіали', render: true },
        { path: '/creators', icon: '🎬', label: 'Творці', render: true },
        { path: '/users', icon: '👥', label: 'Користувачі', render: this.userService.isAdmin() },
        { path: '/statistics', icon: '📊', label: 'Статистика', render: this.userService.isAdmin() },
        { path: '/seed-data', icon: '📥', label: 'Імпорт даних', render: this.userService.isAdmin() }
    ];

    readonly serverStatus = this.serverHealth.status;
    readonly statusLabel = computed(() => STATUS_LABELS[this.serverStatus()]);

    readonly userName = computed(() => {
        const u = this.userService.currentUser();
        return u?.displayName || u?.login || DEFAULT_USER_NAME;
    });

    // Стан відкриття дропдауну користувача
    readonly isUserDropdownOpen = signal(false);

    /** Бічне меню згорнуте до іконок. */
    readonly isSidebarCollapsed = signal(readSidebarCollapsed());

    constructor() {
        timer(0, HEARTBEAT_INTERVAL_MS).pipe(
            exhaustMap(() => this.serverService.pingStatusEndpoint().pipe(catchError(() => EMPTY))),
            takeUntilDestroyed()
        ).subscribe();
    }

    toggleSidebar(): void {
        const collapsed = !this.isSidebarCollapsed();
        this.isSidebarCollapsed.set(collapsed);
        saveSidebarCollapsed(collapsed);
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