import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CollectionService } from '../../services/collection.service';
import { ToastService } from '../../services/toast.service';
import { CollectionSidebar, MediaCollectionResponse } from '../../models/collection.model';
import { MediaLinkListComponent } from '../shared/media-link-list/media-link-list.component';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { CollectionSearchParams, MediaCollectionSortField, SortDirection } from '../../models/search.model';
import { SearchChipComponent } from '../shared/search/search-chip.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { CollectionFormComponent } from '../shared/collection-form/collection-form.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SearchToolbarComponent, SortFieldOption, ToolbarFilter, enumOptions } from '../shared/search/search-toolbar.component';
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';

@Component({
    selector: 'app-collection-list',
    standalone: true,
    imports: [
        MediaLinkListComponent,
        SearchChipComponent,
        ViewSwitcherComponent,
        AddButtonComponent,
        CollectionFormComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './collection-list.component.html',
    styleUrls: ['./collection-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionListComponent implements OnInit {
    private readonly collectionService = inject(CollectionService);
    private readonly toastService = inject(ToastService);

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<MediaCollectionResponse, CollectionSearchParams>({
        search: params => this.collectionService.searchCollections(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Ascending },
        filterKeys: ['visibility', 'hasPoster'],
        isFiltered: ({ query, visibility, hasPoster, tag, ownerUserId }) =>
            !!query || !!tag || !!ownerUserId || visibility !== undefined || hasPoster !== undefined,
        errorMessage: 'Не вдалося завантажити колекції.'
    });
    readonly collections = this.list.items;

    // ---------- Модалка створення / редагування ----------
    private readonly collectionForm = viewChild(CollectionFormComponent);
    readonly modal = createFormModal<MediaCollectionResponse>(this.collectionForm);

    // ---------- Сайдбар деталей (/collections/:id) ----------
    readonly details = createDetailsRoute<never, CollectionSidebar>({
        basePath: '/collections',
        fetch: id => this.collectionService.getCollectionSidebar(id),
        errorMessage: 'Не вдалося завантажити деталі колекції'
    });
    /** Колекція із сайдбару: разом зі списком фільмів (GET /api/collections/{id}/sidebar). */
    readonly selectedCollection = this.details.detail;

    private readonly deleteCallbacks = createDeleteCallbacks((id: string) => this.collectionService.deleteCollection(id));

    readonly selectedDeleteCallback = computed(() => {
        const collection = this.selectedCollection();
        return collection ? this.deleteCallbacks.get(collection.id) : undefined;
    });

    readonly visibilityLabels = VisibilityLabels;

    // Робимо Enum доступним у шаблоні
    readonly SortDirection = SortDirection;

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
        const params = this.list.searchParams();
        return [
            { key: 'hasPoster', label: 'Постер', value: params.hasPoster, options: this.hasPosterOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    ngOnInit(): void {
        this.details.watchRoute();
        this.list.load();
    }

    onEditCollection(): void {
        const collection = this.selectedCollection();
        if (collection) {
            this.modal.openEdit(collection);
        }
    }

    // ====================== Видалення ======================
    onSidebarCollectionDeleted(): void {
        const collection = this.selectedCollection();
        if (!collection) {
            return;
        }

        this.deleteCallbacks.forget(collection.id);
        this.list.removeItems(c => c.id === collection.id);
        this.toastService.show('Колекцію успішно видалено', 'success', 3000);
        this.details.close();
    }

    // ====================== Форма ======================
    onCollectionUpdated(updated: MediaCollectionResponse): void {
        this.modal.close();
        this.collections.update(list => list.map(c => (c.id === updated.id ? updated : c)));
        // Відповідь на оновлення без списку фільмів: зберігаємо поточний список із сайдбару
        this.selectedCollection.update(current => (current?.id === updated.id ? { ...current, ...updated } : current));
    }

    onCollectionCreated(): void {
        this.modal.close();
        this.list.load();
    }
}