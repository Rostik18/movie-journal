import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActorService } from '../../services/actor.service';
import { ToastService } from '../../services/toast.service';
import { MediaLinkListComponent } from '../shared/media-link-list/media-link-list.component';
import { ActorItem, ActorSidebar } from '../../models/actor.model';
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
import { createDeleteCallbacks } from '../../utils/delete-callbacks';
import { createDetailsRoute } from '../../utils/details-route';
import { createFormModal } from '../../utils/form-modal';
import { DEFAULT_PAGE_SIZE, createListState } from '../../utils/list-state';

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
    styleUrls: ['./actor-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActorListComponent implements OnInit {
    private readonly actorService = inject(ActorService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly viewMode = signal<'grid' | 'list'>('grid');

    // ---------- Список: параметри пошуку, пагінація, завантаження ----------
    readonly list = createListState<ActorItem, ActorSearchParams>({
        search: params => this.actorService.searchActors(params),
        defaults: { offset: 0, size: DEFAULT_PAGE_SIZE, sort: SortDirection.Descending },
        filterKeys: ['visibility', 'hasPhoto', 'Sex', 'nationality'],
        isFiltered: ({ query, visibility, hasPhoto, birthYear, Sex, nationality }) =>
            !!query || !!nationality || visibility !== undefined || hasPhoto !== undefined
            || birthYear !== undefined || (Sex !== undefined && Sex !== null),
        errorMessage: 'Не вдалося завантажити акторів.'
    });
    readonly actors = this.list.items;

    // ---------- Модалка створення / редагування ----------
    private readonly actorForm = viewChild(ActorFormComponent);
    readonly modal = createFormModal<ActorItem>(this.actorForm);

    // ---------- Сайдбар деталей (/actors/:id) ----------
    readonly details = createDetailsRoute<never, ActorSidebar>({
        basePath: '/actors',
        fetch: id => this.actorService.getActorSidebar(id),
        errorMessage: 'Не вдалося завантажити деталі актора'
    });
    /** Актор із сайдбару: разом зі списком фільмів (GET /api/actors/{id}/sidebar). */
    readonly selectedActor = this.details.detail;

    private readonly deleteCallbacks = createDeleteCallbacks((id: string) => this.actorService.deleteActor(id));

    readonly selectedDeleteCallback = computed(() => {
        const actor = this.selectedActor();
        return actor ? this.deleteCallbacks.get(actor.id) : undefined;
    });

    readonly mediaTypeLabels = MediaTypeLabels;
    readonly formatNationalities = formatNationalities;
    readonly sexLabels = SexLabels;
    readonly visibilityLabels = VisibilityLabels;

    readonly formatAge = formatAge;
    readonly formatActorName = formatActorName;
    readonly actorAlias = actorAlias;

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
        const params = this.list.searchParams();
        return [
            { key: 'hasPhoto', label: 'Фото', value: params.hasPhoto, options: this.hasPhotoOptions },
            { key: 'visibility', label: 'Видимість', value: params.visibility, options: this.visibilityOptions },
            { key: 'Sex', label: 'Стать', value: params.Sex, options: this.sexOptions },
            { key: 'nationality', label: 'Країна', value: params.nationality, options: this.nationalityOptions(), type: 'select' }
        ];
    });

    ngOnInit(): void {
        this.details.watchRoute();
        this.list.load();
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

    /** Редагування з сайдбару: форма в модалці поверх, сайдбар лишається відкритим і оновиться після збереження. */
    onEditActor(): void {
        const actor = this.selectedActor();
        if (actor) {
            this.modal.openEdit(actor);
        }
    }

    // ====================== Видалення ======================
    onSidebarActorDeleted(): void {
        const actor = this.selectedActor();
        if (!actor) {
            return;
        }

        this.deleteCallbacks.forget(actor.id);
        this.list.removeItems(a => a.id === actor.id);
        this.toastService.show('Актора успішно видалено', 'success', 3000);
        this.loadCountryCodes();
        this.details.close();
    }

    // ====================== Форма ======================
    onActorCreated(): void {
        this.modal.close();
        this.list.load();
        this.loadCountryCodes();
    }

    /** Оновлюємо актора в списку та в сайдбарі без перезавантаження списку. */
    onActorUpdated(updated: ActorItem): void {
        this.modal.close();
        this.actors.update(list => list.map(a => (a.id === updated.id ? updated : a)));
        // Відповідь на оновлення без списку фільмів: зберігаємо поточний список із сайдбару
        this.selectedActor.update(current => (current?.id === updated.id ? { ...current, ...updated } : current));
        this.loadCountryCodes();
    }
}