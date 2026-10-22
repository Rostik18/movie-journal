import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';

import { UserResponse } from '../../models/user.model';
import { SortDirection, UserSearchParams, UserSortField } from '../../models/search.model';
import { UserRole, UserRoleLabels } from '../../models/enums';
import { PageResponse } from '../../models/shared.model';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { UserFormComponent } from '../shared/user-form/user-form.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import {
    SearchToolbarComponent,
    SortFieldOption,
    ToolbarFilter,
    enumOptions
} from '../shared/search-toolbar/search-toolbar.component';

/** Ключі UserSearchParams, якими керують кнопки-фільтри тулбара. */
const FILTER_KEYS = ['role'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULT_PAGE_SIZE = 20;

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [
        DatePipe,
        AddButtonComponent,
        UserFormComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './user-list.component.html',
    styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
    private readonly userService = inject(UserService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly users = signal<UserResponse[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly isModalOpen = signal(false);

    // Видалення: підтвердження в окремому діалозі
    readonly userToDelete = signal<UserResponse | null>(null);
    readonly isDeleting = signal(false);

    /** Власний акаунт видалити не можна: кнопку блокуємо. */
    readonly currentUserId = computed(() => this.userService.currentUser()?.id);

    // Робимо Enum-и доступними у шаблоні
    readonly UserRoleLabels = UserRoleLabels;
    readonly SortDirection = SortDirection;

    readonly searchParams = signal<UserSearchParams>({
        offset: 0,
        size: DEFAULT_PAGE_SIZE,
        sort: SortDirection.Descending
    });

    // ---------- Панель пошуку ----------
    private readonly roleOptions = enumOptions(UserRole, UserRoleLabels);

    // Бекенд підтримує сортування лише за іменем (UserSortField.Name)
    readonly userSortFields: SortFieldOption[] = enumOptions(UserSortField, {
        [UserSortField.Name]: 'Іменем'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => [
        { key: 'role', label: 'Роль', value: this.searchParams().role, options: this.roleOptions }
    ]);

    readonly hasActiveFilters = computed(() => {
        const { name, role } = this.searchParams();
        return !!name || role !== undefined;
    });

    readonly showInitialLoading = computed(() => this.loading() && this.users().length === 0);
    readonly showError = computed(() => this.hasError() && this.users().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.users().length === 0);

    private readonly reload$ = new Subject<void>();

    constructor() {
        // switchMap скасовує попередній запит, якщо список перезавантажили повторно
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.userService.searchUsers(this.searchParams()).pipe(
                    map((response: PageResponse<UserResponse> | UserResponse[] | null) => {
                        const items = Array.isArray(response) ? response : (response?.items ?? []);
                        const total = (!Array.isArray(response) && response?.totalCount) || items.length;
                        return { ok: true as const, items, total };
                    }),
                    catchError(err => {
                        console.error('Помилка завантаження користувачів:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.users.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити користувачів.', 'error', 4000);
            }
            this.loading.set(false);
        });
    }

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        this.reload$.next();
    }

    // ====================== Пагінація, пошук, фільтри, сортування ======================
    onPaginationChange(event: { offset: number; size: number }): void {
        this.updateParams({ offset: event.offset, size: event.size });
    }

    onSearchQueryChanged(name: string): void {
        this.resetPageAndUpdate({ name: name || undefined });
    }

    onFilterChanged(event: { key: string; value: unknown }): void {
        if (!(FILTER_KEYS as readonly string[]).includes(event.key)) {
            return;
        }
        this.resetPageAndUpdate({ [event.key as FilterKey]: event.value } as Partial<UserSearchParams>);
    }

    onSortByChanged(sortBy: unknown): void {
        this.resetPageAndUpdate({ sortBy: sortBy as UserSortField | undefined });
    }

    onSortDirectionChanged(sort: SortDirection): void {
        this.resetPageAndUpdate({ sort });
    }

    resetFilters(): void {
        this.searchParams.update(p => ({
            offset: 0,
            size: p.size,
            sort: p.sort,
            sortBy: p.sortBy
        }));
        this.loadUsers();
    }

    private resetPageAndUpdate(patch: Partial<UserSearchParams>): void {
        this.updateParams({ ...patch, offset: 0 });
    }

    /** Зливає зміни в параметри (undefined прибирає ключ) і перезавантажує список. */
    private updateParams(patch: Partial<UserSearchParams>): void {
        this.searchParams.update(current => {
            const next: Record<string, unknown> = { ...current, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined) {
                    delete next[key];
                }
            }
            return next as UserSearchParams;
        });
        this.loadUsers();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
    }

    /** Закриваємо лише коли mousedown стався саме на підложці (а не після виділення тексту). */
    onBackdropMouseDown(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeTopDialog();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.closeTopDialog();
    }

    /** Діалог підтвердження перекриває форму, тому закривається першим. */
    private closeTopDialog(): void {
        if (this.userToDelete()) {
            this.cancelDelete();
        } else if (this.isModalOpen()) {
            this.closeModal();
        }
    }

    // ====================== Видалення ======================
    canDelete(user: UserResponse): boolean {
        return user.id !== this.currentUserId();
    }

    requestDelete(user: UserResponse): void {
        if (this.canDelete(user)) {
            this.userToDelete.set(user);
        }
    }

    /** Поки йде запит, діалог закрити не можна. */
    cancelDelete(): void {
        if (!this.isDeleting()) {
            this.userToDelete.set(null);
        }
    }

    confirmDelete(): void {
        const user = this.userToDelete();
        if (!user || this.isDeleting()) {
            return;
        }

        this.isDeleting.set(true);

        this.userService.deleteUser(user.id).pipe(
            finalize(() => this.isDeleting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.userToDelete.set(null);
                this.users.update(list => list.filter(u => u.id !== user.id));
                this.totalCount.update(c => Math.max(0, c - 1));
                this.toastService.show(`Користувача "${user.login}" видалено`, 'success', 3000);

                // Видалили останнього на сторінці > 1 — повертаємось на попередню
                const { offset = 0, size = DEFAULT_PAGE_SIZE } = this.searchParams();
                if (this.users().length === 0 && offset > 0) {
                    this.updateParams({ offset: Math.max(0, offset - size) });
                }
            },
            error: err => {
                console.error('Помилка видалення користувача:', err);
                this.toastService.show(`Не вдалося видалити користувача "${user.login}".`, 'error', 5000);
            }
        });
    }

    onUserCreated(user: UserResponse): void {
        this.closeModal();
        this.toastService.show(`Користувача "${user.login}" успішно створено! 🎉`, 'success', 4000);
        // Повертаємось на першу сторінку, щоб побачити нового користувача
        this.updateParams({ offset: 0 });
    }
}