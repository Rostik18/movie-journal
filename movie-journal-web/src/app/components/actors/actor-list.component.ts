import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { ActorService } from '../../services/actor.service';
import { ToastService } from '../../services/toast.service';
import { MediaLinkListComponent } from '../shared/media-link-list/media-link-list.component';
import { ActorItem, ActorSidebar } from '../../models/actor.model';
import { PageResponse } from '../../models/shared.model';
import { countryLabel, countryName, formatNationalities } from '../../utils/country.util';
import { MediaTypeLabels, Sex, SexLabels, Visibility, VisibilityLabels } from '../../models/enums';
import { ActorSearchParams, ActorSortField, SortDirection } from '../../models/search.model';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { ActorFormComponent } from '../shared/actor-form/actor-form.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SearchToolbarComponent, SortFieldOption, ToolbarFilter, enumOptions } from '../shared/search-toolbar/search-toolbar.component';
import { actorAlias, formatActorName, formatAge } from '../../utils/actor-format.util';

type DeleteCallback = () => ReturnType<ActorService['deleteActor']>;
type ActorId = ActorItem['id'];

/** Ключі ActorSearchParams, якими керують кнопки-фільтри тулбара. */
const FILTER_KEYS = ['visibility', 'hasPhoto', 'Sex', 'nationality'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULT_PAGE_SIZE = 20;

@Component({
    selector: 'app-actor-list',
    standalone: true,
    imports: [
        MediaLinkListComponent,
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
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly actors = signal<ActorItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);

    /** Актор, якого редагують у модалці. null — модалка працює як створення. */
    readonly editingActor = signal<ActorItem | null>(null);
    private readonly actorForm = viewChild(ActorFormComponent);

    /** Актор із сайдбару: разом зі списком фільмів (GET /api/actors/{id}/sidebar). */
    readonly selectedActor = signal<ActorSidebar | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly mediaTypeLabels = MediaTypeLabels;
    readonly formatNationalities = formatNationalities;
    readonly sexLabels = SexLabels;
    readonly visibilityLabels = VisibilityLabels;

    readonly formatAge = formatAge;
    readonly formatActorName = formatActorName;
    readonly actorAlias = actorAlias;

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

    private readonly sexOptions = [
        { value: Sex.Male, label: '♂️' },
        { value: Sex.Female, label: '♀️' }
    ];

    /** Країни, що реально зустрічаються в акторів (GET /api/actors/country-codes). */
    private readonly countryCodes = signal<string[]>([]);

    /** Значення — ISO alpha-3, як у BE; підпис — «🇳🇱 Нідерланди», відсортовано за назвою. */
    private readonly nationalityOptions = computed(() =>
        [...this.countryCodes()]
            .sort((a, b) => countryName(a).localeCompare(countryName(b), 'uk'))
            .map(code => ({ value: code, label: countryLabel(code) }))
    );

    readonly actorSortFields: SortFieldOption[] = enumOptions(ActorSortField, {
        [ActorSortField.FullName]: 'Іменем',
        [ActorSortField.BirthDate]: 'Датою народження',
        [ActorSortField.CreatedAt]: 'Датою створення',
        [ActorSortField.UpdatedAt]: 'Датою оновлення',
        [ActorSortField.Sex]: 'Статтю',
        [ActorSortField.Nationality]: 'Громадянством'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.searchParams();
        return [
            { key: 'hasPhoto', label: 'Фото', value: params.hasPhoto, options: this.hasPhotoOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions },
            { key: 'Sex', label: 'Стать', value: params.Sex, options: this.sexOptions },
            { key: 'nationality', label: 'Країна', value: params.nationality, options: this.nationalityOptions(), type: 'select' }
        ];
    });

    readonly hasActiveFilters = computed(() => {
        const { query, visibility, hasPhoto, birthYear, Sex, nationality } = this.searchParams();
        return !!query || !!nationality || visibility !== undefined || hasPhoto !== undefined || birthYear !== undefined || Sex !== undefined && Sex !== null;
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
                )),
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
                this.actorService.getActorSidebar(id).pipe(
                    catchError(err => {
                        console.error('Помилка завантаження деталей актора:', err);
                        this.toastService.show('Не вдалося завантажити деталі актора', 'error');
                        // Некоректне посилання: прибираємо id з адреси
                        this.router.navigate(['/actors'], { replaceUrl: true });
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

    /** URL — джерело правди для сайдбару: /actors/:id відкриває деталі (також при прямому переході й Back/Forward).
     *  Викликається з ngOnInit, коли потоки деталей уже підписані (Subject не буферизує). */
    private watchRoute(): void {
        this.route.paramMap.pipe(
            map(params => params.get('id')),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(id => {
            if (id) {
                this.details$.next(id);
            } else {
                this.isSidebarOpen.set(false);
            }
        });
    }

    ngOnInit(): void {
        this.watchRoute();
        this.loadActors();
        this.loadCountryCodes();
    }

    /** Список країн для фільтра змінюється разом з акторами, тому його оновлюємо після створення / редагування / видалення. */
    private loadCountryCodes(): void {
        this.actorService.getCountryCodes().pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: codes => this.countryCodes.set(codes ?? []),
            error: err => console.error('Помилка завантаження країн:', err)
        });
    }

    loadActors(): void {
        this.reload$.next();
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(actor: ActorItem): void {
        // Деталі завантажуються за зміною маршруту
        this.router.navigate(['/actors', actor.id]);
    }

    /**
     * selectedActor навмисно не скидається: поки панель виїжджає, її вміст має лишатись на місці.
     * Наступне відкриття перезаписує його свіжими даними.
     */
    closeSidebar(): void {
        this.isSidebarOpen.set(false);
        if (this.route.snapshot.paramMap.has('id')) {
            this.router.navigate(['/actors']);
        }
    }

    /** Редагування з сайдбару: форма в модалці поверх, сайдбар лишається відкритим і оновиться після збереження. */
    onEditActor(): void {
        const actor = this.selectedActor();
        if (!actor) {
            return;
        }
        this.editingActor.set(actor);
        this.isModalOpen.set(true);
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
        this.loadCountryCodes();

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
        this.editingActor.set(null);
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
        this.editingActor.set(null);
    }

    /**
     * Закриваємо лише коли mousedown стався саме на підложці (а не після виділення тексту)
     * і форма не містить незбережених змін — щоб випадковий клік не стер введене.
     * Кнопки «Скасувати» та «×» закривають форму завжди.
     */
    onBackdropMouseDown(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModalUnlessDirty();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isModalOpen()) {
            this.closeModalUnlessDirty();
        }
    }

    private closeModalUnlessDirty(): void {
        if (!this.actorForm()?.hasChanges()) {
            this.closeModal();
        }
    }

    onActorCreated(): void {
        this.closeModal();
        this.loadActors();
        this.loadCountryCodes();
    }

    /** Оновлюємо актора в списку та в сайдбарі без перезавантаження списку. */
    onActorUpdated(updated: ActorItem): void {
        this.closeModal();
        this.actors.update(list => list.map(a => (a.id === updated.id ? updated : a)));
        // Відповідь на оновлення без списку фільмів: зберігаємо поточний список із сайдбару
        this.selectedActor.update(current => (current?.id === updated.id ? { ...current, ...updated } : current));
        this.loadCountryCodes();
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