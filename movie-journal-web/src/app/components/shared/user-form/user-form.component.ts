import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { skipErrorToast } from '../../../interceptors/http-error.interceptor';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { UserRole, UserRoleLabels } from '../../../models/enums';
import { CreateUserRequest, UserResponse } from '../../../models/user.model';

/** Мінімальна довжина пароля на клієнті; приведіть у відповідність до правил бекенду. */
const MIN_PASSWORD_LENGTH = 6;

type FieldName = 'login' | 'password' | 'confirmPassword' | 'roles';
type FormErrors = Partial<Record<FieldName, string>>;

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
    private readonly userService = inject(UserService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    /** Користувача створено на сервері: батько закриває модалку й оновлює список. */
    readonly userCreated = output<UserResponse>();

    /** Користувач натиснув «Скасувати». */
    readonly cancelled = output<void>();

    readonly login = signal('');
    readonly displayName = signal('');
    readonly password = signal('');
    readonly confirmPassword = signal('');

    readonly roles = signal<UserRole[]>([UserRole.User]);
    readonly showPassword = signal(false);
    readonly isSubmitting = signal(false);

    /** Помилки валідації показуються під відповідними полями. */
    readonly errors = signal<FormErrors>({});

    readonly minPasswordLength = MIN_PASSWORD_LENGTH;

    readonly roleOptions = Object.values(UserRole).map(value => ({
        value,
        label: UserRoleLabels[value] ?? value
    }));

    isRoleSelected(role: UserRole): boolean {
        return this.roles().includes(role);
    }

    toggleRole(role: UserRole): void {
        this.roles.update(current =>
            current.includes(role) ? current.filter(r => r !== role) : [...current, role]
        );
        this.clearError('roles');
    }

    clearError(field: FieldName): void {
        if (this.errors()[field]) {
            this.errors.update(current => ({ ...current, [field]: undefined }));
        }
    }

    onSubmit(): void {
        if (this.isSubmitting()) {
            return;
        }

        const request = this.validate();
        if (!request) {
            return;
        }

        this.isSubmitting.set(true);

        this.userService.createUser(request, skipErrorToast()).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: user => {
                this.userCreated.emit(user);
                this.resetForm();
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 409) {
                    this.errors.update(current => ({ ...current, login: 'Користувач з таким логіном уже існує.' }));
                    return;
                }
                this.toastService.show(`Не вдалося створити користувача "${request.login}".`, 'error', 6000);
            }
        });
    }

    onCancel(): void {
        if (!this.isSubmitting()) {
            this.cancelled.emit();
        }
    }

    /** Перевіряє форму, показує всі помилки одразу й повертає запит (не мутуючи стан форми). */
    private validate(): CreateUserRequest | null {
        const errors: FormErrors = {};

        const login = this.login().trim();
        if (!login) {
            errors.login = 'Введіть логін.';
        } else if (/\s/.test(login)) {
            errors.login = 'Логін не може містити пробіли.';
        }

        const password = this.password();
        if (!password) {
            errors.password = 'Введіть пароль.';
        } else if (password.length < MIN_PASSWORD_LENGTH) {
            errors.password = `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів.`;
        }

        if (password && this.confirmPassword() !== password) {
            errors.confirmPassword = 'Паролі не збігаються.';
        }

        if (this.roles().length === 0) {
            errors.roles = 'Оберіть щонайменше одну роль.';
        }

        this.errors.set(errors);
        if (Object.keys(errors).length > 0) {
            return null;
        }

        return {
            login,
            displayName: this.displayName().trim() || null,
            roles: this.roles(),
            password
        };
    }

    private resetForm(): void {
        this.login.set('');
        this.displayName.set('');
        this.password.set('');
        this.confirmPassword.set('');
        this.roles.set([UserRole.User]);
        this.showPassword.set(false);
        this.errors.set({});
    }
}