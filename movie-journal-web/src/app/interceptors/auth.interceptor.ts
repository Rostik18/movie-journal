import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    let token = localStorage.getItem('auth_token');

    if (token) {
        token = token.replace(/^Bearer\s+/i, '');

        const clonedReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(clonedReq);
    }

    return next(req);
};