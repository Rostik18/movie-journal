import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ServerHealthService } from '../services/server-health.service';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';

export const serverStatusInterceptor: HttpInterceptorFn = (req, next) => {
    // Запити до сторонніх доменів не мають впливати на статус нашого сервера
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const health = inject(ServerHealthService);

    return next(req).pipe(
        tap({
            next: event => {
                if (event instanceof HttpResponse) {
                    health.recordResponse(event.status);
                }
            },
            error: error => {
                if (error instanceof HttpErrorResponse) {
                    health.recordResponse(error.status);
                }
            }
        })
    );
};