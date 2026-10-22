import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    input,
    linkedSignal,
    output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounce, timer } from 'rxjs';
import { SortDirection } from '../../../models/search.model';

/** Іконки, які можна показати замість тексту на кнопці. */
export type FilterIcon = 'globe' | 'lock';

export interface FilterOption {
    value: unknown;
    label: string;
    /** Якщо задано — кнопка показує іконку (label лишається в title / aria-label). */
    icon?: FilterIcon;
}

/**
 * Фільтр у тулбарі. `value === undefined` (або null) означає «фільтр не задано».
 *
 * - enum: по кнопці на кожне значення з `options`;
 * - boolean: один тристанний чекбокс — порожній (не задано) → ✓ (true) → ✗ (false) → порожній.
 *   Визначається автоматично, коли всі `options` мають значення true/false, або явно через `type: 'boolean'`.
 *   Підписи з options (true/false) використовуються в підказках.
 */
export interface ToolbarFilter {
    key: string;
    label: string;
    value: unknown;
    options?: FilterOption[];
    type?: 'enum' | 'boolean';
}

/** Фільтр, підготовлений для шаблону. */
interface ViewFilter extends ToolbarFilter {
    options: FilterOption[];
    isBoolean: boolean;
}

export interface SortFieldOption {
    value: unknown;
    label: string;
}

/**
 * Будує опції для кнопок з будь-якого TypeScript enum (числового чи рядкового).
 * Для числових enum відкидає зворотні відображення (0 → 'Name').
 *
 * @param labels підписи за значенням enum (наприклад, MediaTypeLabels); без нього — назва члена enum
 * @param icons  іконки за значенням enum (наприклад, { [Visibility.Public]: 'globe' })
 */
export function enumOptions(
    enumObject: object,
    labels?: Partial<Record<string | number, string>>,
    icons?: Partial<Record<string | number, FilterIcon>>
): FilterOption[] {
    return Object.entries(enumObject)
        .filter(([key]) => Number.isNaN(Number(key)))
        .map(([name, value]) => ({
            value,
            label: labels?.[value as string | number] ?? name,
            icon: icons?.[value as string | number]
        }));
}

@Component({
    selector: 'app-search-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="search-toolbar">
            <!-- Єдине текстове поле (query) -->
            <div class="field search-box">
                <input
                    type="search"
                    [value]="queryText()"
                    [placeholder]="searchPlaceholder()"
                    [attr.aria-label]="searchPlaceholder()"
                    (input)="onQueryInput($any($event.target).value)"
                    (keydown.enter)="emitQuery(queryText())"
                    (keydown.escape)="resetQuery()">

                @if (queryText()) {
                    <button type="button" class="btn-reset" title="Скинути пошук" aria-label="Скинути пошук"
                        (click)="resetQuery()">×</button>
                }
            </div>

            <!-- Фільтри: enum — кнопка на кожне значення; boolean — тристанний чекбокс -->
            @for (filter of viewFilters(); track filter.key) {
                <div class="field" role="group" [attr.aria-label]="filter.label">
                    @if (filter.isBoolean) {
                        <button
                            type="button"
                            class="tri-check"
                            role="checkbox"
                            [attr.aria-checked]="booleanAriaState(filter)"
                            [title]="booleanTitle(filter)"
                            (click)="cycleBoolean(filter)">
                            <span class="box" aria-hidden="true">
                                @if (filter.value === true) {
                                    <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>
                                } @else if (filter.value === false) {
                                    <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
                                }
                            </span>
                            <span class="tri-label">{{ filter.label }}</span>
                        </button>
                    } @else {
                    <span class="field-label">{{ filter.label }}</span>

                    <div class="btn-group">
                        @for (opt of filter.options; track opt.value) {
                            <button
                                type="button"
                                class="btn-option"
                                [class.icon-only]="!!opt.icon"
                                [class.active]="filter.value === opt.value"
                                [attr.aria-pressed]="filter.value === opt.value"
                                [attr.aria-label]="opt.label"
                                [title]="opt.label"
                                (click)="toggleFilter(filter, opt)">
                                @switch (opt.icon) {
                                    @case ('globe') {
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M2 12h20" />
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                        </svg>
                                    }
                                    @case ('lock') {
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    }
                                    @default {
                                        {{ opt.label }}
                                    }
                                }
                            </button>
                        }
                    </div>
                    }

                    @if (filter.value != null) {
                        <button type="button" class="btn-reset" [title]="'Скинути: ' + filter.label"
                            [attr.aria-label]="'Скинути: ' + filter.label"
                            (click)="resetFilter(filter)">×</button>
                    }
                </div>
            }

            <!-- Сортування: поле (кнопки) + напрямок -->
            @if (sortFields().length > 0) {
                <div class="field" role="group" aria-label="Сортування">
                    <span class="field-label">Сортування</span>

                    <div class="btn-group">
                        @for (sortOpt of sortFields(); track sortOpt.value) {
                            <button
                                type="button"
                                class="btn-option"
                                [class.active]="currentSortBy() === sortOpt.value"
                                [attr.aria-pressed]="currentSortBy() === sortOpt.value"
                                (click)="toggleSortField(sortOpt.value)">
                                {{ sortOpt.label }}
                            </button>
                        }
                    </div>

                    <button type="button" class="btn-sort-dir" (click)="toggleSortDirection()"
                        title="Змінити напрямок сортування">
                        {{ currentSort() === SortDirection.Ascending ? '⬆ Зрост.' : '⬇ Спад.' }}
                    </button>

                    @if (currentSortBy() !== undefined) {
                        <button type="button" class="btn-reset" title="Скинути сортування"
                            aria-label="Скинути сортування" (click)="sortByChange.emit(undefined)">×</button>
                    }
                </div>
            }
        </div>
    `,
    styleUrls: ['./search-toolbar.component.scss']
})
export class SearchToolbarComponent {
    private readonly destroyRef = inject(DestroyRef);

    // ---- Вхідні дані ----
    readonly searchQuery = input<string | null | undefined>('');
    readonly searchPlaceholder = input<string>('Пошук...');
    /** Затримка перед відправкою query під час набору (мс). */
    readonly debounceMs = input<number>(300);

    readonly filters = input<ToolbarFilter[]>([]);

    /** Фільтри з визначеним типом (boolean / enum) для шаблону. */
    readonly viewFilters = computed<ViewFilter[]>(() =>
        this.filters().map(filter => {
            const options = filter.options ?? [];
            const isBoolean = filter.type
                ? filter.type === 'boolean'
                : options.length > 0 && options.every(o => typeof o.value === 'boolean');
            return { ...filter, options, isBoolean };
        })
    );

    readonly sortFields = input<SortFieldOption[]>([]);
    readonly currentSortBy = input<unknown>(undefined);
    readonly currentSort = input<SortDirection>(SortDirection.Descending);

    // ---- Події ----
    readonly searchQueryChange = output<string>();
    /** `value === undefined` — фільтр скинуто. */
    readonly filterChange = output<{ key: string; value: unknown }>();
    readonly sortByChange = output<unknown>();
    readonly sortDirectionChange = output<SortDirection>();

    readonly SortDirection = SortDirection;

    /** Локальний текст у полі; синхронізується з батьківським значенням при його зміні (скидання ззовні). */
    readonly queryText = linkedSignal(() => this.searchQuery() ?? '');

    private readonly typing$ = new Subject<string>();

    constructor() {
        this.typing$
            .pipe(
                debounce(() => timer(this.debounceMs())),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(value => this.emitQuery(value));
    }

    // ---- Пошук ----
    onQueryInput(value: string): void {
        this.queryText.set(value);
        this.typing$.next(value);
    }

    emitQuery(value: string): void {
        const normalized = value.trim();
        // Не шлемо дубль (Enter після debounce, повторний набір того самого тексту)
        if (normalized === (this.searchQuery() ?? '')) {
            return;
        }
        this.searchQueryChange.emit(normalized);
    }

    resetQuery(): void {
        this.queryText.set('');
        this.emitQuery('');
    }

    // ---- Фільтри ----
    /** Повторний клік по активній кнопці скидає фільтр. */
    toggleFilter(filter: ToolbarFilter, option: FilterOption): void {
        this.filterChange.emit({
            key: filter.key,
            value: filter.value === option.value ? undefined : option.value
        });
    }

    /** Порожній (undefined/null) → true → false → порожній. */
    cycleBoolean(filter: ToolbarFilter): void {
        const next = filter.value === true ? false : filter.value === false ? undefined : true;
        this.filterChange.emit({ key: filter.key, value: next });
    }

    booleanAriaState(filter: ToolbarFilter): 'true' | 'false' | 'mixed' {
        return filter.value === true ? 'true' : filter.value === false ? 'false' : 'mixed';
    }

    booleanTitle(filter: ViewFilter): string {
        const yes = filter.options.find(o => o.value === true)?.label ?? 'Так';
        const no = filter.options.find(o => o.value === false)?.label ?? 'Ні';

        if (filter.value === true) {
            return `«${yes}». Клік — «${no}»`;
        }
        if (filter.value === false) {
            return `«${no}». Клік — скинути`;
        }
        return `${filter.label}: не задано. Клік — «${yes}»`;
    }

    resetFilter(filter: ToolbarFilter): void {
        this.filterChange.emit({ key: filter.key, value: undefined });
    }

    // ---- Сортування ----
    toggleSortField(value: unknown): void {
        this.sortByChange.emit(this.currentSortBy() === value ? undefined : value);
    }

    toggleSortDirection(): void {
        this.sortDirectionChange.emit(
            this.currentSort() === SortDirection.Ascending
                ? SortDirection.Descending
                : SortDirection.Ascending
        );
    }
}