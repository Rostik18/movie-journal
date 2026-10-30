import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ToggleOption<T> {
    value: T;
    /** Підпис: текст кнопки без іконки, підказка й aria-label. */
    label: string;
    /** Іконка-SVG (як у фільтрах search-toolbar). */
    icon?: 'globe' | 'lock';
    /** Символ замість іконки, напр. ♂ / ♀. */
    glyph?: string;
    /** Колір активної кнопки. */
    tone?: 'blue' | 'pink';
}

/**
 * Група кнопок-перемикачів замість випадного списку: одна активна кнопка (як «Видимість» у search-toolbar).
 * `allowClear` — повторний клік по активній кнопці знімає вибір (`null`), напр. «Стать не вказано».
 *
 * Використання: `<app-toggle-group [options]="opts" [value]="x()" (valueChange)="x.set($event)" />`
 */
@Component({
    selector: 'app-toggle-group',
    standalone: true,
    templateUrl: './toggle-group.component.html',
    styleUrls: ['./toggle-group.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleGroupComponent<T> {
    readonly options = input.required<readonly ToggleOption<T>[]>();
    readonly value = input<T | null>(null);
    readonly allowClear = input(false);
    /** Доступна назва групи (напр. «Видимість»). */
    readonly ariaLabel = input('');

    readonly valueChange = output<T | null>();

    select(option: ToggleOption<T>): void {
        if (option.value === this.value()) {
            if (this.allowClear()) {
                this.valueChange.emit(null);
            }
            return;
        }
        this.valueChange.emit(option.value);
    }
}