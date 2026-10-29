import { HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { ToastService } from '../services/toast.service';

/**
 * Вимикає автоматичний тост для конкретного запиту (помилка все одно логується й прокидається далі):
 * `http.get(url, { context: skipErrorToast() })`.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
export const skipErrorToast = (): HttpContext => new HttpContext().set(SKIP_ERROR_TOAST, true);

/** Фонові запити, збій яких не має спамити тостами (стан сервера й так показує індикатор у шапці). */
const SILENT_PATHS = ['/status'];

const TOAST_DURATION_MS = 6000;
/** Однакове повідомлення не показуємо повторно протягом цього часу (напр. кілька паралельних запитів без мережі). */
const DEDUPE_WINDOW_MS = 3000;

// Стан дедуплікації спільний для всіх запитів (інтерсептор-функція викликається на кожен запит)
let lastMessage = '';
let lastShownAt = 0;

/** Деталі від сервера показуємо лише для 400 (валідація) — вони написані для користувача, а не для логів. */
const MAX_SERVER_MESSAGE_LENGTH = 200;

/** Витягує текст помилки з тіла відповіді бекенду: ProblemDetails (`detail`/`title`) або `{ message }`. */
function extractServerMessage(error: HttpErrorResponse): string | null {
    const body: unknown = error.error;

    if (typeof body === 'string') {
        // Не показуємо HTML-сторінки помилок (напр. від проксі)
        return body && !body.trimStart().startsWith('<') ? body : null;
    }
    if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        for (const key of ['detail', 'message', 'Message', 'title']) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) {
                return value;
            }
        }
    }
    return null;
}

/** Осмислене повідомлення для користувача за типом помилки (мережа, 4xx, 5xx). */
export function getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
        return 'Сталася непередбачена помилка.';
    }

    // status 0 — запит не дійшов до сервера (немає мережі, CORS, сервер вимкнений/прокидається)
    if (error.status === 0) {
        return 'Немає зв’язку з сервером. Перевірте інтернет-з’єднання або спробуйте за хвилину.';
    }

    if (error.status === 400) {
        const message = extractServerMessage(error)?.trim();
        return message && message.length <= MAX_SERVER_MESSAGE_LENGTH
            ? `Некоректний запит: ${message}`
            : 'Некоректний запит. Перевірте введені дані.';
    }

    switch (error.status) {
        case 401: return 'Потрібна авторизація.';
        case 403: return 'Недостатньо прав для цієї дії.';
        case 404: return 'Запитаний ресурс не знайдено.';
        case 408:
        case 504: return 'Сервер занадто довго відповідає. Спробуйте ще раз.';
        case 409: return 'Конфлікт: такий запис уже існує або був змінений.';
        case 413: return 'Файл або дані завеликі.';
        case 429: return 'Забагато запитів. Зачекайте трохи й спробуйте знову.';
    }

    if (error.status >= 500) {
        return 'Помилка на сервері. Спробуйте пізніше.';
    }
    if (error.status >= 400) {
        return 'Не вдалося виконати запит.';
    }
    return 'Сталася непередбачена помилка.';
}

/**
 * Єдине місце обробки HTTP-помилок: логує помилку та показує тост з осмисленим текстом.
 * Помилка прокидається далі, тож компонент може додатково реагувати (скинути стан, показати своє повідомлення).
 *
 * Не показує тост для: сторонніх доменів, 401 (це робить unauthorizedInterceptor / форма логіну),
 * скасованих запитів, фонових запитів (`SILENT_PATHS`) та запитів із `skipErrorToast()`.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const toastService = inject(ToastService);

    return next(req).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse) {
                console.error(`HTTP ${error.status} ${req.method} ${req.url}`, error.error ?? error.message);

                const path = req.url.slice(environment.apiUrl.length).split('?')[0];
                const silent = error.status === 401
                    || req.context.get(SKIP_ERROR_TOAST)
                    || SILENT_PATHS.includes(path);

                if (!silent) {
                    const message = getErrorMessage(error);
                    const now = Date.now();
                    if (message !== lastMessage || now - lastShownAt > DEDUPE_WINDOW_MS) {
                        toastService.show(message, 'error', TOAST_DURATION_MS);
                        lastMessage = message;
                        lastShownAt = now;
                    }
                }
            }

            return throwError(() => error);
        })
    );
};