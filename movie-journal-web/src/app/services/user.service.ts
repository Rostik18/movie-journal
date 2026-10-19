import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChangePasswordRequest, CreateUserRequest, UpdateUserRequest, UserResponse, UserSearchParams } from '../models/user.model';
import { UserRole } from '../models/enums';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private baseUrl = `${environment.apiUrl}/api/users`;
    private http = inject(HttpClient);

    // --- РЕАКТИВНИЙ СТАН (SIGNALS) ---
    // Приватний сигнал для зберігання поточного користувача
    private currentUserSignal = signal<UserResponse | null>(this.loadUserFromStorage());

    // Публічний сигнал (доступний лише для читання ззовні)
    public currentUser = this.currentUserSignal.asReadonly();

    // Обчислюваний сигнал (computed), який автоматично визначає, чи є користувач адміном
    public isAdmin = computed(() => {
        const user = this.currentUserSignal();
        return !!user?.roles && user.roles.includes(UserRole.Admin);
    });

    private loadUserFromStorage(): UserResponse | null {
        try {
            const userStr = localStorage.getItem('auth_user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('Помилка читання користувача з localStorage', e);
            return null;
        }
    }

    // Встановлення користувача в стан (викликається під час Login)
    public setUserData(user: UserResponse | null) {
        if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('auth_user');
        }
        this.currentUserSignal.set(user);
    }

    // --- ЕНДПОІНТИ API ---

    // GET /api/users/me (Також може оновлювати стан поточного користувача при завантаженні сторінки)
    getCurrentUser(): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${this.baseUrl}/me`).pipe(
            tap(user => this.setUserData(user))
        );
    }

    // GET /api/users/{userId}
    getUserById(userId: string): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${this.baseUrl}/${userId}`);
    }

    // GET /api/users/search
    searchUsers(params?: UserSearchParams): Observable<any> {
        let httpParams = new HttpParams();

        if (params) {
            if (params.name) httpParams = httpParams.set('name', params.name);
            if (params.role !== undefined && params.role !== null) httpParams = httpParams.set('role', params.role);
            if (params.sortBy !== undefined && params.sortBy !== null) httpParams = httpParams.set('sortBy', params.sortBy);
            if (params.sort !== undefined && params.sort !== null) httpParams = httpParams.set('sort', params.sort);
            if (params.offset !== undefined && params.offset !== null) httpParams = httpParams.set('offset', params.offset);
            if (params.size !== undefined && params.size !== null) httpParams = httpParams.set('size', params.size);
        }

        return this.http.get<any>(`${this.baseUrl}/search`, { params: httpParams });
    }

    // POST /api/users/
    createUser(request: CreateUserRequest): Observable<UserResponse> {
        return this.http.post<UserResponse>(`${this.baseUrl}/`, request);
    }

    // PUT /api/users/
    updateUser(request: UpdateUserRequest): Observable<UserResponse> {
        return this.http.put<UserResponse>(`${this.baseUrl}/`, request);
    }

    // PUT /api/users/password
    changePassword(request: ChangePasswordRequest): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/password`, request);
    }

    // DELETE /api/users/{userId}
    deleteUser(userId: string): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${userId}`);
    }
}