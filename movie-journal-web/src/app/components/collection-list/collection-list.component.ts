import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { CollectionService } from '../../services/collection.service';
import { ToastService } from '../../services/toast.service';
import { MediaCollectionResponse } from '../../models/collection.model';
import { PageResponse } from '../../models/shared.model';
import { VisibilityLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { CollectionFormComponent } from '../shared/collection-form/collection-form.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';

type DeleteCallback = () => ReturnType<CollectionService['deleteCollection']>;
type CollectionId = MediaCollectionResponse['id'];

@Component({
    selector: 'app-collection-list',
    standalone: true,
    imports: [
        CommonModule,
        ViewSwitcherComponent,
        AddButtonComponent,
        CollectionFormComponent,
        GridCardComponent,
        DetailsSidebarComponent
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

    readonly selectedCollection = signal<MediaCollectionResponse | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly visibilityLabels = VisibilityLabels;

    // Стани для шаблону: завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.collections().length === 0);
    readonly showError = computed(() => this.hasError() && this.collections().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.collections().length === 0);

    private readonly reload$ = new Subject<void>();
    private readonly details$ = new Subject<CollectionId>();

    /** Кешування колбеків видалення для запобігання новим викликам у CD */
    private readonly deleteCallbacks = new Map<CollectionId, DeleteCallback>();

    constructor() {
        // Завантаження списку колекцій з автоматичним скасуванням попереднього запиту
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.collectionService.searchCollections().pipe(
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
        console.log('Редагувати колекцію:', this.selectedCollection()?.id);
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
    }

    onSidebarCollectionDeleted(): void {
        const collection = this.selectedCollection();
        if (!collection) return;

        this.onDeleted(collection);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
    }

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

    onCollectionCreated(): void {
        this.closeModal();
        this.loadCollections();
    }
}