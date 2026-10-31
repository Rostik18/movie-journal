import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { SeriesService } from '../../services/series.service';
import { ToastService } from '../../services/toast.service';
import { EpisodeResponse, SeriesResponse, SeriesResponseSb } from '../../models/series.model';
import { RouterLink } from '@angular/router';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { SeriesSearchParams, SeriesSortField, SortDirection } from '../../models/search.model';
import { SearchChipComponent } from '../shared/search/search-chip.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SearchToolbarComponent, SortFieldOption, ToolbarFilter, enumOptions } from '../shared/search/search-toolbar.component';
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';
import { SeriesFormComponent } from '../shared/series-form/series-form.component';

@Component({
    selector: 'app-series-list',
    standalone: true,
    imports: [
        RouterLink,
        SearchChipComponent,
        ViewSwitcherComponent,
        AddButtonComponent,
        SeriesFormComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        PaginationComponent,
        SearchToolbarComponent
    ],
    templateUrl: './series-list.component.html',
    styleUrls: ['./series-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeriesListComponent implements OnInit {
    private readonly seriesService = inject(SeriesService);
    private readonly toastService = inject(ToastService);

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<SeriesResponse, SeriesSearchParams>({
        search: params => this.seriesService.searchSeries(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Ascending },
        filterKeys: ['visibility', 'hasPoster'],
        isFiltered: ({ query, visibility, hasPoster, tag, ownerUserId }) =>
            !!query || !!tag || !!ownerUserId || visibility !== undefined || hasPoster !== undefined,
        errorMessage: 'Не вдалося завантажити серіали.'
    });
    readonly seriesItems = this.list.items;

    // ---------- Модалка створення / редагування ----------
    private readonly seriesForm = viewChild(SeriesFormComponent);
    readonly modal = createFormModal<SeriesResponse>(this.seriesForm);

    // ---------- Сайдбар деталей (/series/:id) ----------
    readonly details = createDetailsRoute<never, SeriesResponseSb>({
        basePath: '/series',
        fetch: id => this.seriesService.getSeriesSidebar(id),
        errorMessage: 'Не вдалося завантажити деталі серіалу'
    });
    /** Серіал із сайдбару: разом зі списком епізодів (GET /api/series/{id}/sidebar). */
    readonly selectedSeries = this.details.detail;

    private readonly deleteCallbacks = createDeleteCallbacks((id: string) => this.seriesService.deleteSeries(id));

    readonly selectedDeleteCallback = computed(() => {
        const series = this.selectedSeries();
        return series ? this.deleteCallbacks.get(series.id) : undefined;
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

    readonly seriesSortFields: SortFieldOption[] = enumOptions(SeriesSortField, {
        [SeriesSortField.Title]: 'Назвою'
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

    /** «Сезон 1 · Серія 3» (лише ті частини, що відомі). */
    episodeLabel(ep: EpisodeResponse): string {
        const parts: string[] = [];
        if (ep.season != null) {
            parts.push(`Сезон ${ep.season}`);
        }
        if (ep.episode != null) {
            parts.push(`Серія ${ep.episode}`);
        }
        return parts.join(' · ');
    }

    onEditSeries(): void {
        const series = this.selectedSeries();
        if (series) {
            // BE у сайдбарі віддає назву як name, а у формі/списку — title
            this.modal.openEdit({
                id: series.id,
                title: series.title,
                description: series.description,
                posterUrl: series.posterUrl,
                tags: series.tags,
                visibility: series.visibility
            });
        }
    }

    // ====================== Видалення ======================
    onSidebarSeriesDeleted(): void {
        const series = this.selectedSeries();
        if (!series) {
            return;
        }

        this.deleteCallbacks.forget(series.id);
        this.list.removeItems(s => s.id === series.id);
        this.toastService.show('Серіал успішно видалено', 'success', 3000);
        this.details.close();
    }

    // ====================== Форма ======================
    onSeriesUpdated(updated: SeriesResponse): void {
        this.modal.close();
        this.seriesItems.update(list => list.map(s => (s.id === updated.id ? updated : s)));
        // Відповідь на оновлення без списку епізодів: зберігаємо поточний список із сайдбару
        this.selectedSeries.update(current => current?.id === updated.id
            ? { ...current, name: updated.title, description: updated.description, posterUrl: updated.posterUrl, tags: updated.tags, visibility: updated.visibility }
            : current);
    }

    onSeriesCreated(): void {
        this.modal.close();
        this.list.load();
    }
}