import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChangePasswordRequest, CreateUserRequest, UpdateUserRequest, UserResponse } from '../models/user.model';
import { UserRole } from '../models/enums';
import { UserSearchParams } from '../models/search.model';
import { PageResponse } from '../models/shared.model';
import { AuthStorage } from './auth-storage.service';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private baseUrl = `${environment.apiUrl}/api/users`;
    private http = inject(HttpClient);
    private authStorage = inject(AuthStorage);

    // --- РЕАКТИВНИЙ СТАН (SIGNALS) ---
    // Приватний сигнал для зберігання поточного користувача
    private currentUserSignal = signal<UserResponse | null>(this.authStorage.getUser());

    // Публічний сигнал (доступний лише для читання ззовні)
    public currentUser = this.currentUserSignal.asReadonly();

    // Обчислюваний сигнал (computed), який автоматично визначає, чи є користувач адміном
    public isAdmin = computed(() => {
        const user = this.currentUserSignal();
        return !!user?.roles && user.roles.includes(UserRole.Admin);
    });

    // Встановлення користувача в стан (викликається під час Login)
    public setUserData(user: UserResponse | null) {
        this.authStorage.setUser(user);
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
    searchUsers(params?: UserSearchParams): Observable<PageResponse<UserResponse>> {
        let httpParams = new HttpParams();

        if (params) {
            if (params.name) httpParams = httpParams.set('name', params.name);
            if (params.role !== undefined && params.role !== null) httpParams = httpParams.set('role', params.role);
            if (params.sortBy !== undefined && params.sortBy !== null) httpParams = httpParams.set('sortBy', params.sortBy);
            if (params.sort !== undefined && params.sort !== null) httpParams = httpParams.set('sort', params.sort);
            if (params.offset !== undefined && params.offset !== null) httpParams = httpParams.set('offset', params.offset);
            if (params.size !== undefined && params.size !== null) httpParams = httpParams.set('size', params.size);
        }

        return this.http.get<PageResponse<UserResponse>>(`${this.baseUrl}/search`, { params: httpParams });
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
    changePassword(request: ChangePasswordRequest): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/password`, request);
    }

    // DELETE /api/users/{userId}
    deleteUser(userId: string): Observable<UserResponse> {
        return this.http.delete<UserResponse>(`${this.baseUrl}/${userId}`);
    }
}