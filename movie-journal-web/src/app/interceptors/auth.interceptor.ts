import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthStorage } from '../services/auth-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = inject(AuthStorage).getToken();

    if (token) {
        return next(req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        }));
    }

    return next(req);
};