import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResult } from '../models/user.model';
import { AuthStorage } from './auth-storage.service';
import { UserService } from './user.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/api/auth/login`;

    private http = inject(HttpClient);
    private authStorage = inject(AuthStorage);
    private userService = inject(UserService);

    login(credentials: { login: string; password: string }): Observable<any> {
        return this.http.post(this.apiUrl, credentials);
    }

    /** Зберігає результат успішного входу: токен і поточного користувача. */
    startSession(result: LoginResult): void {
        if (result.accessToken) {
            this.authStorage.setToken(result.accessToken);
        }
        if (result.user) {
            this.userService.setUserData(result.user);
        }
    }

    /** Завершує сесію: прибирає токен і користувача зі сховища та зі стану застосунку. */
    logout(): void {
        this.authStorage.clear();
        this.userService.setUserData(null);
    }
}