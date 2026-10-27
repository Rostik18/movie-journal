import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

/**
 * 401 на запит із токеном = сесія закінчилась (токен протух або відкликаний):
 * чистимо збережені дані й ведемо на /login, запам'ятавши поточну адресу.
 * 401 без токена (напр. невірний пароль на логіні) не чіпаємо — його обробляє сам компонент.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
    // Помилки сторонніх доменів не стосуються нашої сесії
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const router = inject(Router);
    const authService = inject(AuthService);
    const toastService = inject(ToastService);

    return next(req).pipe(
        catchError((error: unknown) => {
            const hadToken = req.headers.has('Authorization');

            if (error instanceof HttpErrorResponse && error.status === 401 && hadToken) {
                // Кілька паралельних запитів можуть упасти разом — реагуємо лише на перший
                if (!router.url.startsWith('/login')) {
                    const returnUrl = router.url;

                    authService.logout();

                    toastService.show('Сесія завершилась. Увійдіть знову.', 'error', 5000);
                    router.navigate(['/login'], {
                        replaceUrl: true,
                        queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {}
                    });
                }
            }

            return throwError(() => error);
        })
    );
};