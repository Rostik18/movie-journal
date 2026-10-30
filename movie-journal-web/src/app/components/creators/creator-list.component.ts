import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CreatorResponse, CreatorSidebar } from '../../models/creator.model';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { CreatorSearchParams, CreatorSortField, SortDirection } from '../../models/search.model';
import { CreatorService } from '../../services/creator.service';
import { ToastService } from '../../services/toast.service';
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { MediaLinkListComponent } from '../shared/media-link-list/media-link-list.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import {
    SearchToolbarComponent,
    SortFieldOption,
    ToolbarFilter,
    enumOptions
} from '../shared/search/search-toolbar.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { CreatorFormComponent } from '../shared/creator-form/creator-form.component';

@Component({
    selector: 'app-creator-list',
    standalone: true,
    imports: [
        MediaLinkListComponent,
        ViewSwitcherComponent,
        AddButtonComponent,
        CreatorFormComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './creator-list.component.html',
    styleUrls: ['./creator-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreatorListComponent implements OnInit {
    private readonly creatorService = inject(CreatorService);
    private readonly toastService = inject(ToastService);

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<CreatorResponse, CreatorSearchParams>({
        search: params => this.creatorService.searchCreators(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Ascending },
        filterKeys: ['visibility', 'hasPhoto'],
        isFiltered: ({ query, visibility, hasPhoto }) =>
            !!query || visibility !== undefined || hasPhoto !== undefined,
        errorMessage: 'Не вдалося завантажити творців.'
    });
    readonly creators = this.list.items;

    // ---------- Модалка створення / редагування ----------
    private readonly creatorForm = viewChild(CreatorFormComponent);
    readonly modal = createFormModal<CreatorResponse>(this.creatorForm);

    // ---------- Сайдбар деталей (/creators/:id) ----------
    readonly details = createDetailsRoute<never, CreatorSidebar>({
        basePath: '/creators',
        fetch: id => this.creatorService.getCreatorSidebar(id),
        errorMessage: 'Не вдалося завантажити деталі творця'
    });
    /** Творець із сайдбару: разом зі списком фільмів (GET /api/creators/{id}/sidebar). */
    readonly selectedCreator = this.details.detail;

    private readonly deleteCallbacks = createDeleteCallbacks((id: string) => this.creatorService.deleteCreator(id));

    readonly selectedDeleteCallback = computed(() => {
        const creator = this.selectedCreator();
        return creator ? this.deleteCallbacks.get(creator.id) : undefined;
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

    private readonly hasPhotoOptions = [
        { value: true, label: 'З фото' },
        { value: false, label: 'Без фото' }
    ];

    readonly creatorSortFields: SortFieldOption[] = enumOptions(CreatorSortField, {
        [CreatorSortField.Name]: 'Назвою',
        [CreatorSortField.CreatedAt]: 'Датою створення',
        [CreatorSortField.UpdatedAt]: 'Датою оновлення'
    });

    // computed, а не масив у шаблоні: інакше новий масив на кожен цикл change detection
    readonly toolbarFilters = computed<ToolbarFilter[]>(() => {
        const params = this.list.searchParams();
        return [
            { key: 'hasPhoto', label: 'Фото', value: params.hasPhoto, options: this.hasPhotoOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions }
        ];
    });

    ngOnInit(): void {
        this.details.watchRoute();
        this.list.load();
    }

    onEditCreator(): void {
        const creator = this.selectedCreator();
        if (creator) {
            this.modal.openEdit(creator);
        }
    }

    // ====================== Видалення ======================
    onSidebarCreatorDeleted(): void {
        const creator = this.selectedCreator();
        if (!creator) {
            return;
        }

        this.deleteCallbacks.forget(creator.id);
        this.list.removeItems(c => c.id === creator.id);
        this.toastService.show('Творця успішно видалено', 'success', 3000);
        this.details.close();
    }

    // ====================== Форма ======================
    onCreatorUpdated(updated: CreatorResponse): void {
        this.modal.close();
        this.creators.update(list => list.map(c => (c.id === updated.id ? updated : c)));
        // Відповідь на оновлення без списку фільмів: зберігаємо поточний список із сайдбару
        this.selectedCreator.update(current => (current?.id === updated.id ? { ...current, ...updated } : current));
    }

    onCreatorCreated(): void {
        this.modal.close();
        this.list.load();
    }
}