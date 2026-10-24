import { Component, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { CollectionService } from '../../services/collection.service';
import { ToastService } from '../../services/toast.service';
import { MediaCollectionResponse } from '../../models/collection.model';
import { PageResponse } from '../../models/shared.model';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { CollectionSearchParams, MediaCollectionSortField, SortDirection } from '../../models/search.model';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { CollectionFormComponent } from '../shared/collection-form/collection-form.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import {
    SearchToolbarComponent,
    SortFieldOption,
    ToolbarFilter,
    enumOptions
} from '../shared/search-toolbar/search-toolbar.component';

type DeleteCallback = () => ReturnType<CollectionService['deleteCollection']>;
type CollectionId = MediaCollectionResponse['id'];

/** Ключі CollectionSearchParams, якими керують кнопки-фільтри тулбара. */
const FILTER_KEYS = ['visibility', 'hasPoster'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULT_PAGE_SIZE = 20;

@Component({
    selector: 'app-collection-list',
    standalone: true,
    imports: [
        ViewSwitcherComponent,
        AddButtonComponent,
        CollectionFormComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './collection-list.component.html',
    styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit {
    private readonly collectionService = inject(CollectionService);
    private readonly toastService = inject(ToastService);

    readonly collections = signal<MediaCollectionResponse[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);
    /** Колекція, що редагується; null — модалка працює в режимі створення. */
    readonly editingCollection = signal<MediaCollectionResponse | null>(null);
    private readonly collectionForm = viewChild(CollectionFormComponent);

    readonly selectedCollection = signal<MediaCollectionResponse | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly visibilityLabels = VisibilityLabels;

    // Робимо Enum доступним у шаблоні
    readonly SortDirection = SortDirection;

    readonly searchParams = signal<CollectionSearchParams>({
        offset: 0,
        size: DEFAULT_PAGE_SIZE,
        sort: SortDirection.Ascending
    });

    // ---------- Панель пошуку ----------
    private readonly visibilityOptions = enumOptions(
        Visibility,
        { [Visibility.Public]: 'Публічні', [Visibility.Private]: 'Приватні' },
        { [Visibility.Public]: 'globe', [Visibility.Private]: 'lock' }
    );

    private readonly hasPosterOptions = [
        { value: true, label: 'З постером' },
        { value: false, label: 'Без постера' }
    ];

    readonly collectionSortFields: SortFieldOption[] = enumOptions(MediaCollectionSortField, {
        [MediaCollectionSortField.Name]: 'Назвою'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.searchParams();
        return [
            { key: 'hasPoster', label: 'Постер', value: params.hasPoster, options: this.hasPosterOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    readonly hasActiveFilters = computed(() => {
        const { query, visibility, hasPoster, tag, ownerUserId } = this.searchParams();
        return !!query || !!tag || !!ownerUserId || visibility !== undefined || hasPoster !== undefined;
    });

    // Стани для шаблону: завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.collections().length === 0);
    readonly showError = computed(() => this.hasError() && this.collections().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.collections().length === 0);

    private readonly reload$ = new Subject<void>();
    private readonly details$ = new Subject<CollectionId>();

    /** Кешування колбеків видалення для запобігання новим викликам у CD */
    private readonly deleteCallbacks = new Map<CollectionId, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const collection = this.selectedCollection();
        return collection ? this.getDeleteCallback(collection) : undefined;
    });

    constructor() {
        // Завантаження списку колекцій з автоматичним скасуванням попереднього запиту
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.collectionService.searchCollections(this.searchParams()).pipe(
                    map((response: PageResponse<MediaCollectionResponse>) => ({
                        ok: true as const,
                        items: response.items ?? [],
                        total: response.totalCount ?? response.items?.length ?? 0
                    })),
                    catchError(err => {
                        console.error('Помилка завантаження колекцій:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.collections.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити колекції.', 'error', 4000);
            }
            this.loading.set(false);
        });

        // Запити деталей колекції для сайдбару з switchMap
        this.details$.pipe(
            switchMap(id =>
                this.collectionService.getCollectionById(id).pipe(
                    catchError(err => {
                        console.error('Помилка завантаження деталей колекції:', err);
                        this.toastService.show('Не вдалося завантажити деталі колекції', 'error');
                        return EMPTY;
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(detailedCol => {
            this.selectedCollection.set(detailedCol);
            this.isSidebarOpen.set(true);
        });
    }

    ngOnInit(): void {
        this.loadCollections();
    }

    loadCollections(): void {
        this.reload$.next();
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(collection: MediaCollectionResponse): void {
        this.details$.next(collection.id);
    }

    /**
     * selectedCollection навмисно не скидається: поки панель виїжджає, її вміст має лишатись на місці.
     */
    closeSidebar(): void {
        this.isSidebarOpen.set(false);
    }

    onEditCollection(): void {
        const collection = this.selectedCollection();
        if (!collection) {
            return;
        }
        this.editingCollection.set(collection);
        this.isModalOpen.set(true);
    }

    // ====================== Видалення ======================
    getDeleteCallback(collection: MediaCollectionResponse): DeleteCallback {
        const colId = collection.id;

        let callback = this.deleteCallbacks.get(colId);
        if (!callback) {
            callback = () => this.collectionService.deleteCollection(colId);
            this.deleteCallbacks.set(colId, callback);
        }
        return callback;
    }

    onDeleted(collection: MediaCollectionResponse): void {
        const colId = collection.id;

        this.deleteCallbacks.delete(colId);
        this.collections.update(list => list.filter(c => c.id !== colId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Колекцію успішно видалено', 'success', 3000);

        // Видалили останній елемент на сторінці > 1 — повертаємось на попередню
        const { offset = 0, size = DEFAULT_PAGE_SIZE } = this.searchParams();
        if (this.collections().length === 0 && offset > 0) {
            this.updateParams({ offset: Math.max(0, offset - size) });
        }
    }

    onSidebarCollectionDeleted(): void {
        const collection = this.selectedCollection();
        if (!collection) {
            return;
        }

        this.onDeleted(collection);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.editingCollection.set(null);
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
        this.editingCollection.set(null);
    }

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

    /** Backdrop/Escape не закривають форму з незбереженими змінами (хрестик — закриває завжди). */
    private closeModalUnlessDirty(): void {
        if (!this.collectionForm()?.hasChanges()) {
            this.closeModal();
        }
    }

    onCollectionUpdated(updated: MediaCollectionResponse): void {
        this.closeModal();
        this.collections.update(list => list.map(c => (c.id === updated.id ? updated : c)));
        if (this.selectedCollection()?.id === updated.id) {
            this.selectedCollection.set(updated);
        }
    }

    onCollectionCreated(): void {
        this.closeModal();
        this.loadCollections();
    }

    // ====================== Пагінація, пошук, фільтри, сортування ======================
    onPaginationChange(event: { offset: number; size: number }): void {
        this.updateParams({ offset: event.offset, size: event.size });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onSearchQueryChanged(query: string): void {
        this.resetPageAndUpdate({ query: query || undefined });
    }

    onFilterChanged(event: { key: string; value: unknown }): void {
        if (!(FILTER_KEYS as readonly string[]).includes(event.key)) {
            return;
        }
        this.resetPageAndUpdate({ [event.key as FilterKey]: event.value } as Partial<CollectionSearchParams>);
    }

    onSortByChanged(sortBy: unknown): void {
        this.resetPageAndUpdate({ sortBy: sortBy as MediaCollectionSortField | undefined });
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
        this.loadCollections();
    }

    private resetPageAndUpdate(patch: Partial<CollectionSearchParams>): void {
        this.updateParams({ ...patch, offset: 0 });
    }

    /** Зливає зміни в параметри (undefined прибирає ключ) і перезавантажує список. */
    private updateParams(patch: Partial<CollectionSearchParams>): void {
        this.searchParams.update(current => {
            const next: Record<string, unknown> = { ...current, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined) {
                    delete next[key];
                }
            }
            return next as CollectionSearchParams;
        });
        this.loadCollections();
    }
}