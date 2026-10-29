import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginResult } from '../../models/user.model';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule], // Потрібно для роботи з формою [(ngModel)]
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
    userService = inject(UserService);

    // Змінні для збереження даних з інпутів
    readonly login = signal('');
    readonly password = signal('');

    readonly errorMessage = signal('');
    readonly successMessage = signal('');

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    /** Адреса, з якої користувача перекинуло на логін; приймаємо лише внутрішні шляхи (захист від open redirect). */
    private safeReturnUrl(): string {
        const url = this.route.snapshot.queryParamMap.get('returnUrl');
        return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : '/movies';
    }

    onSubmit() {
        this.authService.login({ login: this.login(), password: this.password() }).subscribe({
            next: (response: LoginResult) => {
                console.log('Успішний вхід:', response);

                this.authService.startSession(response);

                this.successMessage.set('Успішна авторизація!');
                this.errorMessage.set('');
                this.router.navigateByUrl(this.safeReturnUrl());
            },
            error: (err) => {
                console.error('Помилка входу:', err);
                this.errorMessage.set('Помилка логіну або пароля. Спробуйте ще раз.');
            }
        });
    }
}