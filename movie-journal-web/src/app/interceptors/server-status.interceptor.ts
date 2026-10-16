import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ServerStatusService } from '../services/server-status.service';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const serverStatusInterceptor: HttpInterceptorFn = (req, next) => {
    const statusService = inject(ServerStatusService);

    return next(req).pipe(
        tap(() => {
            statusService.recordSuccess();
        }),
        catchError((error: HttpErrorResponse) => {
            statusService.recordError(error.status);
            return throwError(() => error);
        })
    );
};