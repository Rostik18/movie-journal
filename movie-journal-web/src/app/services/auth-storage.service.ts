import { Injectable } from '@angular/core';

import { UserResponse } from '../models/user.model';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

/**
 * Єдине місце, що знає, як і де зберігаються токен та користувач (localStorage).
 * Усі звернення до сховища обгорнуті в try/catch: воно може бути недоступним (приватний режим, заблоковані дані).
 */
@Injectable({
    providedIn: 'root'
})
export class AuthStorage {
    /** Токен без префікса «Bearer » (на випадок, якщо бекенд повернув його з префіксом). */
    getToken(): string | null {
        try {
            const raw = localStorage.getItem(AUTH_TOKEN_KEY);
            return raw ? raw.replace(/^Bearer\s+/i, '') : null;
        } catch {
            return null;
        }
    }

    setToken(token: string): void {
        try {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
        } catch (e) {
            console.error('Не вдалося зберегти токен', e);
        }
    }

    getUser(): UserResponse | null {
        try {
            const raw = localStorage.getItem(AUTH_USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Помилка читання користувача з localStorage', e);
            return null;
        }
    }

    setUser(user: UserResponse | null): void {
        try {
            if (user) {
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(AUTH_USER_KEY);
            }
        } catch (e) {
            console.error('Не вдалося зберегти користувача', e);
        }
    }

    /** Прибирає токен і користувача. */
    clear(): void {
        try {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
        } catch { /* сховище недоступне — нічого прибирати */ }
    }

    /** Токен є і (якщо в ньому вказано exp) ще не прострочений. Перевірка на клієнті лише для UX — справжню валідацію робить бекенд. */
    hasValidToken(): boolean {
        const token = this.getToken();
        if (!token) {
            return false;
        }
        const exp = this.getTokenExpiry(token);
        return exp === null || exp * 1000 > Date.now();
    }

    /** Читає exp (секунди) із payload JWT; null — якщо токен не JWT або exp відсутній. */
    private getTokenExpiry(token: string): number | null {
        try {
            const payload = token.split('.')[1];
            if (!payload) {
                return null;
            }
            const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            const exp = JSON.parse(json)?.exp;
            return typeof exp === 'number' ? exp : null;
        } catch {
            return null;
        }
    }
}