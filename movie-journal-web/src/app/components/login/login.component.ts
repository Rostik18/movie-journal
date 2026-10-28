import { Component, inject } from '@angular/core';
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
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    userService = inject(UserService);

    // Змінні для збереження даних з інпутів
    loginData = {
        login: '',
        password: ''
    };

    errorMessage = '';
    successMessage = '';

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    /** Адреса, з якої користувача перекинуло на логін; приймаємо лише внутрішні шляхи (захист від open redirect). */
    private safeReturnUrl(): string {
        const url = this.route.snapshot.queryParamMap.get('returnUrl');
        return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : '/movies';
    }

    onSubmit() {
        this.authService.login(this.loginData).subscribe({
            next: (response: LoginResult) => {
                console.log('Успішний вхід:', response);

                this.authService.startSession(response);

                this.successMessage = 'Успішна авторизація!';
                this.errorMessage = '';
                this.router.navigateByUrl(this.safeReturnUrl());
            },
            error: (err) => {
                console.error('Помилка входу:', err);
                this.errorMessage = 'Помилка логіну або пароля. Спробуйте ще раз.';
            }
        });
    }
}