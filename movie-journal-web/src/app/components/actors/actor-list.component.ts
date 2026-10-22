import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ActorService } from '../../services/actor.service';
import { ToastService } from '../../services/toast.service';
import { ActorItem } from '../../models/actor.model';
import { PageResponse } from '../../models/shared.model';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { ActorSearchParams, ActorSortField, SortDirection } from '../../models/search.model';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { ActorFormComponent } from '../shared/actor-form/actor-form.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import {
    SearchToolbarComponent,
    SortFieldOption,
    ToolbarFilter,
    enumOptions
} from '../shared/search-toolbar/search-toolbar.component';
import { formatAge } from '../../utils/actor-format.util';

type DeleteCallback = () => ReturnType<ActorService['deleteActor']>;
type ActorId = ActorItem['id'];

/** Ключі ActorSearchParams, якими керують кнопки-фільтри тулбара. */
const FILTER_KEYS = ['visibility', 'hasPhoto'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULT_PAGE_SIZE = 20;

@Component({
    selector: 'app-actor-list',
    standalone: true,
    imports: [
        DatePipe,
        ViewSwitcherComponent,
        AddButtonComponent,
        ActorFormComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './actor-list.component.html',
    styleUrls: ['./actor-list.component.scss']
})
export class ActorListComponent implements OnInit {
    private readonly actorService = inject(ActorService);
    private readonly toastService = inject(ToastService);

    readonly actors = signal<ActorItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);

    readonly selectedActor = signal<ActorItem | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly visibilityLabels = VisibilityLabels;

    readonly formatAge = formatAge;

    // Робимо Enum доступним у шаблоні
    readonly SortDirection = SortDirection;

    readonly searchParams = signal<ActorSearchParams>({
        offset: 0,
        size: DEFAULT_PAGE_SIZE,
        sort: SortDirection.Descending
    });

    // ---------- Панель пошуку ----------
    private readonly visibilityOptions = enumOptions(
        Visibility,
        { [Visibility.Public]: 'Публічні', [Visibility.Private]: 'Приватні' },
        { [Visibility.Public]: 'globe', [Visibility.Private]: 'lock' }
    );

    private readonly hasPhotoOptions = [
        { value: true, label: 'З фото' },
        { value: false, label: 'Без фото' }
    ];

    readonly actorSortFields: SortFieldOption[] = enumOptions(ActorSortField, {
        [ActorSortField.FullName]: 'Іменем',
        [ActorSortField.BirthDate]: 'Датою народження',
        [ActorSortField.CreatedAt]: 'Датою створення',
        [ActorSortField.UpdatedAt]: 'Датою оновлення'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.searchParams();
        return [
            { key: 'hasPhoto', label: 'Фото', value: params.hasPhoto, options: this.hasPhotoOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    readonly hasActiveFilters = computed(() => {
        const { query, visibility, hasPhoto, birthYear } = this.searchParams();
        return !!query || visibility !== undefined || hasPhoto !== undefined || birthYear !== undefined;
    });

    // Стани для шаблону: початкове завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.actors().length === 0);
    readonly showError = computed(() => this.hasError() && this.actors().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.actors().length === 0);

    private readonly reload$ = new Subject<void>();
    private readonly details$ = new Subject<ActorId>();

    /** Колбеки видалення кешуються, щоб у шаблоні не створювалась нова функція на кожен цикл CD. */
    private readonly deleteCallbacks = new Map<ActorId, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const actor = this.selectedActor();
        return actor ? this.getDeleteCallback(actor) : undefined;
    });

    constructor() {
        // switchMap скасовує попередній запит, якщо список перезавантажили повторно
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.actorService.searchActors(this.searchParams()).pipe(
                    map((response: PageResponse<ActorItem>) => ({
                        ok: true as const,
                        items: response.items ?? [],
                        total: response.totalCount ?? response.items?.length ?? 0
                    })),
                    catchError(err => {
                        console.error('Помилка завантаження акторів:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.actors.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити акторів.', 'error', 4000);
            }
            this.loading.set(false);
        });

        // Швидкі кліки по різних акторах: відповідь на попередній запит скасовується
        this.details$.pipe(
            switchMap(id =>
                this.actorService.getActorById(id).pipe(
                    catchError(err => {
                        console.error('Помилка завантаження деталей актора:', err);
                        this.toastService.show('Не вдалося завантажити деталі актора', 'error');
                        return EMPTY;
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(detailedActor => {
            this.selectedActor.set(detailedActor);
            this.isSidebarOpen.set(true);
        });
    }

    ngOnInit(): void {
        this.loadActors();
    }

    loadActors(): void {
        this.reload$.next();
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(actor: ActorItem): void {
        this.details$.next(actor.id);
    }

    /**
     * selectedActor навмисно не скидається: поки панель виїжджає, її вміст має лишатись на місці.
     * Наступне відкриття перезаписує його свіжими даними.
     */
    closeSidebar(): void {
        this.isSidebarOpen.set(false);
    }

    onEditActor(): void {
        // Тут у майбутньому ви відкриєте форму редагування
        console.log('Редагувати актора:', this.selectedActor()?.id);
    }

    // ====================== Видалення ======================
    getDeleteCallback(actor: ActorItem): DeleteCallback {
        const actorId = actor.id;

        let callback = this.deleteCallbacks.get(actorId);
        if (!callback) {
            callback = () => this.actorService.deleteActor(actorId);
            this.deleteCallbacks.set(actorId, callback);
        }
        return callback;
    }

    onDeleted(actor: ActorItem): void {
        const actorId = actor.id;

        this.deleteCallbacks.delete(actorId);
        this.actors.update(list => list.filter(a => a.id !== actorId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Актора успішно видалено', 'success', 3000);

        // Видалили останній елемент на сторінці > 1 — повертаємось на попередню
        const { offset = 0, size = DEFAULT_PAGE_SIZE } = this.searchParams();
        if (this.actors().length === 0 && offset > 0) {
            this.updateParams({ offset: Math.max(0, offset - size) });
        }
    }

    onSidebarActorDeleted(): void {
        const actor = this.selectedActor();
        if (!actor) {
            return;
        }

        this.onDeleted(actor);
        this.closeSidebar();
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
            this.closeModal();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isModalOpen()) {
            this.closeModal();
        }
    }

    onActorCreated(): void {
        this.closeModal();
        this.loadActors();
    }

    // ====================== Пагінація, пошук, фільтри, сортування ======================
    onPaginationChange(event: { offset: number; size: number }): void {
        this.updateParams({ offset: event.offset, size: event.size });
    }

    onSearchQueryChanged(query: string): void {
        this.resetPageAndUpdate({ query: query || undefined });
    }

    onFilterChanged(event: { key: string; value: unknown }): void {
        if (!(FILTER_KEYS as readonly string[]).includes(event.key)) {
            return;
        }
        this.resetPageAndUpdate({ [event.key as FilterKey]: event.value } as Partial<ActorSearchParams>);
    }

    onSortByChanged(sortBy: unknown): void {
        this.resetPageAndUpdate({ sortBy: sortBy as ActorSortField | undefined });
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
        this.loadActors();
    }

    private resetPageAndUpdate(patch: Partial<ActorSearchParams>): void {
        this.updateParams({ ...patch, offset: 0 });
    }

    /** Зливає зміни в параметри (undefined прибирає ключ) і перезавантажує список. */
    private updateParams(patch: Partial<ActorSearchParams>): void {
        this.searchParams.update(current => {
            const next: Record<string, unknown> = { ...current, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined) {
                    delete next[key];
                }
            }
            return next as ActorSearchParams;
        });
        this.loadActors();
    }
}