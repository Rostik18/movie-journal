import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { Visibility } from '../../../models/enums';

/** Кліки по цих елементах усередині картки не вважаються кліком по самій картці. */
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea';

@Component({
    selector: 'app-grid-card',
    standalone: true,
    templateUrl: './grid-card.component.html',
    styleUrls: ['./grid-card.component.scss'],
})
export class GridCardComponent {
    readonly imageUrl = input<string | null | undefined>();
    readonly imageAlt = input<string>('');
    readonly title = input.required<string>();
    readonly noImageText = input<string>('Немає фото');

    readonly badge = input<string | null | undefined>();
    readonly badgeClass = input<string>('');
    readonly visibility = input<Visibility | string | null | undefined>();

    readonly cardClick = output<void>();

    /** Скидається при кожній зміні imageUrl, тому нове зображення отримує нову спробу завантаження. */
    readonly imageFailed = linkedSignal(() => {
        this.imageUrl();
        return false;
    });
    readonly hasImage = computed(() => !!this.imageUrl() && !this.imageFailed());

    // Порівняння з enum, а не з рядком 'Public': працює і для рядкового, і для числового Visibility.
    // Перевірка на null/undefined замість truthy, щоб значення 0 не ховало іконку.
    readonly hasVisibility = computed(() => {
        const value = this.visibility();
        return value !== null && value !== undefined && value !== '';
    });
    readonly isPublic = computed(() => this.visibility() === Visibility.Public);

    onClick(event: MouseEvent): void {
        if (this.isFromInteractiveChild(event)) {
            return;
        }
        this.cardClick.emit();
    }

    /** Enter / Space відкривають картку лише коли фокус на самій картці, а не на кнопці всередині. */
    onKeydown(event: Event): void {
        if (event.target !== event.currentTarget) {
            return;
        }
        event.preventDefault();
        this.cardClick.emit();
    }

    private isFromInteractiveChild(event: MouseEvent): boolean {
        const interactive = (event.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
        return !!interactive && (event.currentTarget as Element).contains(interactive);
    }
}