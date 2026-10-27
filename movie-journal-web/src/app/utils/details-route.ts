import { DestroyRef, Signal, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { ToastService } from '../services/toast.service';

/**
 * Скорочений запис зі списку: доступний одразу, тому сайдбар може показати заголовок і постер,
 * поки вантажаться повні деталі.
 */
export interface DetailsSummaryConfig<TSummary, TDetail> {
    /** Запис списку за id (null, якщо його немає — пряме посилання або інша сторінка). */
    find: (id: string) => TSummary | null;
    /** Скорочений запис, зібраний із повного (для прямого посилання). */
    fromDetail: (detail: TDetail) => TSummary;
}

export interface DetailsRouteConfig<TSummary, TDetail> {
    /** Шлях списку, напр. '/movies'; сайдбар відкривається на `${basePath}/:id`. */
    basePath: string;
    /** Завантаження повних деталей (зазвичай GET …/{id}/sidebar). */
    fetch: (id: string) => Observable<TDetail>;
    /** Текст тосту при помилці завантаження деталей. */
    errorMessage: string;
    /**
     * Якщо задано — сайдбар відкривається одразу зі скороченим записом і сам показує стан
     * завантаження/помилки (з кнопкою «Спробувати знову»). Якщо ні — сайдбар відкривається лише
     * коли деталі отримано, а при помилці користувача повертає на список.
     */
    summary?: DetailsSummaryConfig<TSummary, TDetail>;
}

export interface DetailsRoute<TSummary, TDetail> {
    readonly isOpen: Signal<boolean>;
    /** Скорочений запис (лише з `summary` у конфігурації). */
    readonly summary: WritableSignal<TSummary | null>;
    /** Повні деталі; null, поки вантажаться (з `summary`) або не відкрито жодного запису. */
    readonly detail: WritableSignal<TDetail | null>;
    readonly loading: Signal<boolean>;
    readonly error: Signal<boolean>;

    /** URL — джерело правди: підписка на :id у маршруті. Викликати з ngOnInit (Subject деталей не буферизує). */
    watchRoute(): void;
    /** Відкриває запис (клік у списку): змінює маршрут; деталі завантажуються за зміною маршруту. */
    open(id: string, summary?: TSummary): void;
    /** Повторне завантаження (кнопка «Спробувати знову»). */
    reload(): void;
    /** Тихо перечитує деталі відкритого запису (без індикатора завантаження), напр. після редагування. */
    refresh(): void;
    /**
     * Закриває панель. Деталі навмисно не скидаються: поки панель виїжджає, її вміст має лишатись на місці;
     * наступне відкриття перезаписує його свіжими даними.
     */
    close(): void;
}

/**
 * Сайдбар деталей, прив'язаний до маршруту `path/:id`: відкривається прямим переходом, кліком і Back/Forward.
 * Викликати в ініціалізаторі поля компонента (потрібен контекст ін'єкції).
 */
export function createDetailsRoute<TSummary, TDetail>(
    config: DetailsRouteConfig<TSummary, TDetail>
): DetailsRoute<TSummary, TDetail> {
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const toastService = inject(ToastService);
    const destroyRef = inject(DestroyRef);

    const isOpen = signal(false);
    const summary = signal<TSummary | null>(null);
    const detail = signal<TDetail | null>(null);
    const loading = signal(false);
    const error = signal(false);
    const showsSummary = !!config.summary;

    /** id запису, який зараз відкрито/вантажиться. */
    let currentId: string | null = null;
    /** id для завантаження деталей; null — скасувати поточний запит. */
    const details$ = new Subject<string | null>();

    // switchMap відкидає відповідь, якщо користувач клікнув інший запис або закрив сайдбар до її приходу
    details$.pipe(
        switchMap(id => {
            if (id === null) {
                return of(null);
            }
            if (showsSummary) {
                loading.set(true);
                error.set(false);
            }
            return config.fetch(id).pipe(
                map(result => ({ ok: true as const, result })),
                catchError(err => {
                    console.error('Помилка завантаження деталей:', err);
                    return of({ ok: false as const });
                })
            );
        }),
        takeUntilDestroyed()
    ).subscribe(outcome => {
        loading.set(false);
        if (outcome === null) {
            return;
        }
        if (outcome.ok) {
            const loaded = outcome.result;
            if (config.summary && summary() === null) {
                // Пряме посилання: скороченого запису зі списку немає — будуємо його з повного
                summary.set(config.summary.fromDetail(loaded));
            }
            detail.set(loaded);
            isOpen.set(true);
        } else if (showsSummary) {
            error.set(true);
            toastService.show(config.errorMessage, 'error');
        } else {
            toastService.show(config.errorMessage, 'error');
            // Некоректне посилання: прибираємо id з адреси
            router.navigate([config.basePath], { replaceUrl: true });
        }
    });

    const showFor = (id: string, knownSummary: TSummary | null): void => {
        currentId = id;
        if (showsSummary) {
            summary.set(knownSummary);
            detail.set(null); // не показуємо дані попереднього запису
            isOpen.set(true);
        }
        details$.next(id);
    };

    const hide = (): void => {
        currentId = null;
        isOpen.set(false);
        details$.next(null); // скасовуємо запит, що ще летить
        error.set(false);
    };

    const syncWithRoute = (id: string | null): void => {
        if (!id) {
            if (isOpen() || currentId !== null) {
                hide();
            }
            return;
        }
        // Уже відкрито через клік у списку — нічого не робимо
        if (currentId === id && (isOpen() || loading())) {
            return;
        }
        showFor(id, config.summary?.find(id) ?? null);
    };

    return {
        isOpen: isOpen.asReadonly(),
        summary,
        detail,
        loading: loading.asReadonly(),
        error: error.asReadonly(),

        watchRoute: () => {
            route.paramMap.pipe(
                map(params => params.get('id')),
                distinctUntilChanged(),
                takeUntilDestroyed(destroyRef)
            ).subscribe(syncWithRoute);
        },

        open: (id, knownSummary) => {
            if (showsSummary) {
                showFor(id, knownSummary ?? config.summary?.find(id) ?? null);
            }
            router.navigate([config.basePath, id]);
        },

        reload: () => {
            const id = currentId ?? route.snapshot.paramMap.get('id');
            if (id) {
                details$.next(id);
            }
        },

        refresh: () => {
            const id = currentId;
            if (!id) {
                return;
            }
            config.fetch(id).pipe(
                takeUntilDestroyed(destroyRef)
            ).subscribe({
                next: fresh => {
                    if (currentId === id) {
                        detail.set(fresh);
                    }
                },
                error: err => console.error('Не вдалося оновити сайдбар:', err)
            });
        },

        close: () => {
            hide();
            if (route.snapshot.paramMap.has('id')) {
                router.navigate([config.basePath]);
            }
        }
    };
}