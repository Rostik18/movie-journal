import { Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { SortDirection } from '../models/search.model';
import { PageResponse } from '../models/shared.model';
import { ToastService } from '../services/toast.service';

export const DEFAULT_PAGE_SIZE = 20;

/** Поля, які є в параметрах пошуку кожного зі списків. */
export interface ListParams {
    query?: string;
    offset?: number;
    size?: number;
    sort?: SortDirection;
    sortBy?: unknown;
}

export interface ListStateConfig<TItem, TParams extends ListParams> {
    /** Запит до API. Може повертати як сторінку { items, totalCount }, так і простий масив. */
    search: (params: TParams) => Observable<PageResponse<TItem> | TItem[] | null | undefined>;
    /** Початкові параметри (зазвичай offset, size і напрямок сортування). */
    defaults: TParams;
    /** Ключі параметрів, якими керують кнопки-фільтри тулбара (решту onFilterChanged ігнорує). */
    filterKeys: readonly (keyof TParams & string)[];
    /** Чи задано хоч один фільтр або пошуковий рядок (для повідомлення «Нічого не знайдено» та кнопки скидання). */
    isFiltered: (params: TParams) => boolean;
    /** Текст тосту при помилці завантаження списку. */
    errorMessage: string;
}

export interface ListState<TItem, TParams extends ListParams> {
    readonly items: WritableSignal<TItem[]>;
    readonly totalCount: WritableSignal<number>;
    readonly loading: Signal<boolean>;
    readonly hasError: Signal<boolean>;
    readonly searchParams: Signal<TParams>;

    // Стани для шаблону: початкове завантаження / помилка / порожній список
    readonly showInitialLoading: Signal<boolean>;
    readonly showError: Signal<boolean>;
    readonly showEmpty: Signal<boolean>;
    readonly hasActiveFilters: Signal<boolean>;

    /** (Пере)завантажує список; попередній запит, що ще летить, скасовується. */
    load(): void;
    /** Зливає зміни в параметри (undefined прибирає ключ) і перезавантажує список. */
    updateParams(patch: Partial<TParams>): void;
    resetFilters(): void;
    onPaginationChange(event: { offset: number; size: number }): void;
    onSearchQueryChanged(query: string): void;
    onFilterChanged(event: { key: string; value: unknown }): void;
    onSortByChanged(sortBy: unknown): void;
    onSortDirectionChanged(sort: SortDirection): void;
    /**
     * Прибирає елементи зі списку без перезавантаження (після видалення).
     * Якщо видалили останній елемент на сторінці > 1, повертається на попередню сторінку.
     */
    removeItems(predicate: (item: TItem) => boolean): void;
}

/**
 * Параметри пошуку, пагінація, фільтри й завантаження списку — спільне для всіх сторінок-списків.
 * Викликати в ініціалізаторі поля компонента (потрібен контекст ін'єкції); перше завантаження — `load()` в ngOnInit.
 */
export function createListState<TItem, TParams extends ListParams>(
    config: ListStateConfig<TItem, TParams>
): ListState<TItem, TParams> {
    const toastService = inject(ToastService);

    const items = signal<TItem[]>([]);
    const totalCount = signal(0);
    const loading = signal(true);
    const hasError = signal(false);
    const searchParams = signal<TParams>(config.defaults);

    const reload$ = new Subject<void>();

    // switchMap скасовує попередній запит, якщо список перезавантажили повторно
    reload$.pipe(
        tap(() => {
            loading.set(true);
            hasError.set(false);
        }),
        switchMap(() =>
            config.search(searchParams()).pipe(
                map(res => {
                    const list: TItem[] = Array.isArray(res) ? res : (res?.items ?? []);
                    const total = (!Array.isArray(res) && res?.totalCount) || list.length;
                    return { ok: true as const, items: list, total };
                }),
                catchError(err => {
                    console.error('Помилка завантаження списку:', err);
                    return of({ ok: false as const });
                })
            )
        ),
        takeUntilDestroyed()
    ).subscribe(result => {
        if (result.ok) {
            items.set(result.items);
            totalCount.set(result.total);
        } else {
            hasError.set(true);
            toastService.show(config.errorMessage, 'error', 4000);
        }
        loading.set(false);
    });

    const load = (): void => reload$.next();

    const updateParams = (patch: Partial<TParams>): void => {
        searchParams.update(current => {
            const next: Record<string, unknown> = { ...current, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined) {
                    delete next[key];
                }
            }
            return next as TParams;
        });
        load();
    };

    // Будь-яка зміна пошуку/фільтра/сортування повертає на першу сторінку
    const resetPageAndUpdate = (patch: Partial<TParams>): void => updateParams({ ...patch, offset: 0 });

    return {
        items,
        totalCount,
        loading: loading.asReadonly(),
        hasError: hasError.asReadonly(),
        searchParams: searchParams.asReadonly(),

        showInitialLoading: computed(() => loading() && items().length === 0),
        showError: computed(() => hasError() && items().length === 0),
        showEmpty: computed(() => !loading() && !hasError() && items().length === 0),
        hasActiveFilters: computed(() => config.isFiltered(searchParams())),

        load,
        updateParams,

        resetFilters: () => {
            searchParams.update(p => ({
                ...config.defaults,
                offset: 0,
                size: p.size,
                sort: p.sort,
                sortBy: p.sortBy
            }));
            load();
        },

        onPaginationChange: event => {
            updateParams({ offset: event.offset, size: event.size } as Partial<TParams>);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        onSearchQueryChanged: query => resetPageAndUpdate({ query: query || undefined } as Partial<TParams>),

        onFilterChanged: event => {
            if (!(config.filterKeys as readonly string[]).includes(event.key)) {
                return;
            }
            resetPageAndUpdate({ [event.key]: event.value } as Partial<TParams>);
        },

        onSortByChanged: sortBy => resetPageAndUpdate({ sortBy } as Partial<TParams>),

        onSortDirectionChanged: sort => resetPageAndUpdate({ sort } as Partial<TParams>),

        removeItems: predicate => {
            const before = items().length;
            items.update(list => list.filter(item => !predicate(item)));
            const removed = before - items().length;
            totalCount.update(c => Math.max(0, c - removed));

            const { offset = 0, size = DEFAULT_PAGE_SIZE } = searchParams();
            if (items().length === 0 && offset > 0) {
                updateParams({ offset: Math.max(0, offset - size) } as Partial<TParams>);
            }
        }
    };
}