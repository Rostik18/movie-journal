import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { UserResponse } from '../../models/user.model';
import { ToastComponent } from '../shared/toast/toast.component';
import { ServerStatusService } from '../../services/server-status.service';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
    templateUrl: './main-layout.component.html',
    styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
    private router = inject(Router);
    statusService = inject(ServerStatusService);

    getUserName(): string {
        const userJson = localStorage.getItem('auth_user');
        if (userJson) {
            const user: UserResponse = JSON.parse(userJson);
            return user.displayName || user.login;
        }
        return 'Користувач';
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user'); // Очищаємо користувача
        this.router.navigate(['/login']);
    }
}