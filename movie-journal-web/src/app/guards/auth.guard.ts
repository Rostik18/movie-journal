import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { AuthStorage } from '../services/auth-storage.service';

/** Пускає лише авторизованих; інакше — на /login із запам'ятованою адресою (returnUrl). */
export const authGuard: CanActivateFn = (_route, state) => {
    const router = inject(Router);

    if (inject(AuthStorage).hasValidToken()) {
        return true;
    }

    // Прострочений/зіпсований токен прибираємо, щоб не пропонувати його далі
    inject(AuthService).logout();

    const isRoot = !state.url || state.url === '/';
    return router.createUrlTree(['/login'], isRoot ? {} : { queryParams: { returnUrl: state.url } });
};

/** Для /login: вже авторизованого користувача одразу відправляє до застосунку. */
export const guestGuard: CanActivateFn = () => {
    const router = inject(Router);
    return inject(AuthStorage).hasValidToken() ? router.createUrlTree(['/']) : true;
};