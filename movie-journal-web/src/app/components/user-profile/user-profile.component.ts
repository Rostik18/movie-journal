import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { UserResponse, UpdateUserRequest, ChangePasswordRequest } from '../../models/user.model';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
    private readonly userService = inject(UserService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);

    readonly currentUser = signal<UserResponse | null>(null);
    readonly loading = signal(true);

    // Форма оновлення даних користувача
    readonly profileForm = this.fb.group({
        login: ['', [Validators.required, Validators.minLength(3)]],
        displayName: ['']
    });

    // Форма зміни пароля
    readonly passwordForm = this.fb.group({
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
    });

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        console.log('Завантаження профілю...');

        this.loading.set(true);
        this.userService.getCurrentUser().pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (user) => {
                this.currentUser.set(user);
                this.profileForm.patchValue({
                    login: user.login,
                    displayName: user.displayName
                });
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка завантаження профілю:', err);
                this.toastService.show('Не вдалося завантажити дані профілю.', 'error');
                this.loading.set(false);
            }
        });
    }

    onUpdateProfile(): void {
        const user = this.currentUser();
        if (this.profileForm.invalid || !user) return;

        const val = this.profileForm.value;
        const request: UpdateUserRequest = {
            userId: user.id,
            login: val.login || undefined,
            displayName: val.displayName || null,
            roles: user.roles // Зберігаємо поточні ролі
        };

        this.userService.updateUser(request).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (updatedUser) => {
                this.currentUser.set(updatedUser);
                this.userService.setUserData(updatedUser); // Оновлюємо кеш у сервісі / localStorage
                this.toastService.show('Профіль успішно оновлено! ✅', 'success');
            },
            error: (err) => {
                console.error('Помилка оновлення профілю:', err);
                this.toastService.show('Не вдалося оновити профіль.', 'error');
            }
        });
    }

    onChangePassword(): void {
        const user = this.currentUser();
        if (this.passwordForm.invalid || !user) return;

        const val = this.passwordForm.value;
        if (val.newPassword !== val.confirmPassword) {
            this.toastService.show('Нові паролі не збігаються!', 'error');
            return;
        }

        const request: ChangePasswordRequest = {
            userId: user.id,
            newPassword: val.newPassword!
        };

        this.userService.changePassword(request).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show('Пароль успішно змінено! 🔒', 'success');
                this.passwordForm.reset();
            },
            error: (err) => {
                console.error('Помилка зміни пароля:', err);
                this.toastService.show('Не вдалося змінити пароль.', 'error');
            }
        });
    }
}