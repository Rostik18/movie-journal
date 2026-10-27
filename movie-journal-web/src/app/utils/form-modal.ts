import { DOCUMENT } from '@angular/common';
import { Signal, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent } from 'rxjs';

export interface FormModal<TEdit> {
    readonly isOpen: Signal<boolean>;
    /** Запис, що редагується; null — модалка працює в режимі створення. */
    readonly editing: WritableSignal<TEdit | null>;
    openCreate(): void;
    openEdit(item: TEdit): void;
    /** Закриває завжди (кнопки «×» та «Скасувати», успішне збереження). */
    close(): void;
    /**
     * Закриваємо лише коли mousedown стався саме на підложці (а не після виділення тексту)
     * і форма не містить незбережених змін — щоб випадковий клік не стер введене.
     */
    onBackdropMouseDown(event: MouseEvent): void;
}

/**
 * Модальне вікно з формою створення/редагування: відкриття, закриття та захист від втрати незбережених змін
 * (backdrop і Escape не закривають форму з правками).
 *
 * `form` — сигнал viewChild(...) форми, оголошений у компоненті (запити шаблону мають бути полем самого компонента).
 */
export function createFormModal<TEdit>(
    form: Signal<{ hasChanges(): boolean } | undefined>
): FormModal<TEdit> {
    const isOpen = signal(false);
    const editing = signal<TEdit | null>(null);

    const close = (): void => {
        isOpen.set(false);
        editing.set(null);
    };

    const closeUnlessDirty = (): void => {
        if (!form()?.hasChanges()) {
            close();
        }
    };

    fromEvent<KeyboardEvent>(inject(DOCUMENT), 'keydown').pipe(
        filter(event => event.key === 'Escape' && isOpen()),
        takeUntilDestroyed()
    ).subscribe(() => closeUnlessDirty());

    return {
        isOpen: isOpen.asReadonly(),
        editing,
        openCreate: () => {
            editing.set(null);
            isOpen.set(true);
        },
        openEdit: item => {
            editing.set(item);
            isOpen.set(true);
        },
        close,
        onBackdropMouseDown: event => {
            if (event.target === event.currentTarget) {
                closeUnlessDirty();
            }
        }
    };
}