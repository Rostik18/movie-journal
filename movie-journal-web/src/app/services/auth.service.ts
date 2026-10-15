import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/api/auth/login`;

    private http = inject(HttpClient);

    login(credentials: { login: string; password: string }): Observable<any> {
        return this.http.post(this.apiUrl, credentials);
    }
}