import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LoginResult } from '../../models/user.model';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule], // Потрібно для роботи з формою [(ngModel)]
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    // Змінні для збереження даних з інпутів
    loginData = {
        login: '',
        password: ''
    };

    errorMessage = '';
    successMessage = '';

    private router = inject(Router);
    private authService = inject(AuthService);

    onSubmit() {
        this.authService.login(this.loginData).subscribe({
            next: (response: LoginResult) => {
                console.log('Успішний вхід:', response);

                // Зберігаємо токен
                if (response.accessToken) {
                    localStorage.setItem('auth_token', response.accessToken);
                }

                // Зберігаємо об'єкт користувача у форматі JSON
                if (response.user) {
                    localStorage.setItem('auth_user', JSON.stringify(response.user));
                }

                this.successMessage = 'Успішна авторизація!';
                this.errorMessage = '';
                this.router.navigate(['/movies']);
            },
            error: (err) => {
                console.error('Помилка входу:', err);
                this.errorMessage = 'Помилка логіну або пароля. Спробуйте ще раз.';
            }
        });
    }
}