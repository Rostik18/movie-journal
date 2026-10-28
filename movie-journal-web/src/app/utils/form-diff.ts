/**
 * Спільна «лише змінене» логіка форм редагування.
 *
 * Форма тримає нормалізований знімок полів (рядки/числа/enum — значення порівнюються через !==)
 * та baseline — знімок на момент відкриття. За ними визначаємо dirty-стан і будуємо payload оновлення,
 * у якому незмінені поля = null (бекенд null-поля не оновлює).
 */

/** Чи відрізняється хоч одне поле знімка від baseline. */
export function hasSnapshotChanges<S extends object>(current: S, baseline: S): boolean {
    return (Object.keys(current) as (keyof S)[]).some(key => current[key] !== baseline[key]);
}

/**
 * Правило для поля payload, значення якого не збігається зі знімком:
 * `when` — ключ (або ключі) знімка, зміна якого вмикає поле; `value` — що надсилати.
 */
export interface DiffRule<S, V> {
    when: keyof S | readonly (keyof S)[];
    value: () => V;
}

export type DiffSpec<S> = Record<string, keyof S | DiffRule<S, unknown>>;

export type DiffResult<S, Spec> = {
    -readonly [K in keyof Spec]: Spec[K] extends DiffRule<S, infer V>
    ? V | null
    : Spec[K] extends keyof S
    ? S[Spec[K]] | null
    : never;
};

/**
 * Будує payload оновлення: поле payload => ключ знімка (береться значення знімка, якщо воно змінилось)
 * або DiffRule (довільне значення, якщо змінився один із ключів). Незмінені поля — null.
 *
 * @example
 * diffPayload(current, baseline, {
 *     title: 'title',
 *     genres: { when: 'genres', value: () => parseCommaList(genresInput) }
 * });
 */
export function diffPayload<S extends object, const Spec extends DiffSpec<S>>(
    current: S,
    baseline: S,
    spec: Spec
): DiffResult<S, Spec> {
    const changed = (key: keyof S): boolean => current[key] !== baseline[key];
    const result: Record<string, unknown> = {};

    for (const [field, rule] of Object.entries(spec)) {
        if (typeof rule === 'object') {
            const keys = Array.isArray(rule.when) ? rule.when : [rule.when];
            result[field] = (keys as (keyof S)[]).some(changed) ? rule.value() : null;
        } else {
            const key = rule as keyof S;
            result[field] = changed(key) ? current[key] : null;
        }
    }

    return result as DiffResult<S, Spec>;
}
/**
 * Стан «чисто / змінено» форми редагування: baseline (знімок на момент відкриття або останнього збереження),
 * dirty-check і побудова payload. Замінює однаковий код baseline / hasChanges / diffPayload у кожній формі.
 */
export interface DirtyTracker<S extends object> {
    /** Знімок на момент останнього markClean(); null, поки форму не ініціалізовано (і не задано `initial`). */
    readonly baseline: S | null;
    /** Поточний стан форми стає новою точкою відліку (після завантаження запису або успішного збереження). */
    markClean(): void;
    hasChanges(): boolean;
    /** Чи змінилось поле відносно baseline. */
    changed(key: keyof S): boolean;
    /** Payload оновлення: незмінені поля — null (див. diffPayload). `current` — знімок, якщо потрібен не поточний. */
    diff<const Spec extends DiffSpec<S>>(spec: Spec, current?: S): DiffResult<S, Spec>;
}

/**
 * @param snapshot функція, що знімає нормалізований стан форми (викликається ліниво, тож може використовувати поля класу)
 * @param initial  початковий baseline, якщо форма «чиста» ще до ініціалізації (напр. порожня форма створення)
 */
export function createDirtyTracker<S extends object>(snapshot: () => S, initial: S | null = null): DirtyTracker<S> {
    let baseline: S | null = initial;

    return {
        get baseline() {
            return baseline;
        },
        markClean: () => {
            baseline = snapshot();
        },
        hasChanges: () => baseline !== null && hasSnapshotChanges(snapshot(), baseline),
        changed: key => baseline !== null && snapshot()[key] !== baseline[key],
        diff: (spec, current = snapshot()) => diffPayload(current, baseline ?? current, spec)
    };
}