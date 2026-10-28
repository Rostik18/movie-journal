import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface PageChange {
    offset: number;
    size: number;
}

/** Компактна пагінація в один рядок: «21–40 з 135  ‹ ›  [20]». Розрахована на розміщення в шапці сторінки. */
@Component({
    selector: 'app-pagination',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (total() > 0) {
            <nav class="pagination" aria-label="Пагінація">
                <span class="range" aria-live="polite"
                    [title]="'Сторінка ' + (page() + 1) + ' із ' + totalPages()">
                    <strong>{{ rangeStart() }}–{{ rangeEnd() }}</strong> з {{ total() }}
                </span>

                <div class="nav-buttons">
                    <button type="button" class="btn-page" aria-label="Попередня сторінка" title="Попередня"
                        [disabled]="page() === 0" (click)="goTo(page() - 1)">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button type="button" class="btn-page" aria-label="Наступна сторінка" title="Наступна"
                        [disabled]="page() >= totalPages() - 1" (click)="goTo(page() + 1)">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>

                <select #sizeSelect class="page-size-select" aria-label="Елементів на сторінці" title="Елементів на сторінці"
                    (change)="onSizeChange(sizeSelect.value)">
                    @for (s of sizeOptions(); track s) {
                        <option [value]="s" [selected]="s === size()">{{ s }}</option>
                    }
                </select>
            </nav>
        }
    `,
    styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
    readonly offset = input.required<number>();
    readonly size = input.required<number>();
    readonly total = input.required<number>();
    readonly pageSizeOptions = input<readonly number[]>([20, 50, 100]);

    readonly pageChange = output<PageChange>();

    /** Якщо поточний розмір не входить у список (наприклад, прийшов ззовні) — додаємо його, щоб select не показував хибне значення. */
    readonly sizeOptions = computed(() => {
        const options = this.pageSizeOptions();
        const size = this.size();
        return options.includes(size) ? options : [...options, size].sort((a, b) => a - b);
    });

    private readonly safeSize = computed(() => Math.max(1, this.size()));

    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.safeSize())));

    /** Поточна сторінка (з 0), обмежена діапазоном — навіть якщо offset вийшов за межі після видалення/фільтрації. */
    readonly page = computed(() =>
        Math.min(Math.floor(this.offset() / this.safeSize()), this.totalPages() - 1)
    );

    readonly rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * this.safeSize() + 1));
    readonly rangeEnd = computed(() => Math.min((this.page() + 1) * this.safeSize(), this.total()));

    goTo(page: number): void {
        const target = Math.min(Math.max(page, 0), this.totalPages() - 1);
        if (target === this.page()) {
            return;
        }
        this.pageChange.emit({ offset: target * this.safeSize(), size: this.size() });

        const contentContainer = document.querySelector('.app-content');
        if (contentContainer) {
            contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    onSizeChange(value: string): void {
        const newSize = Number(value);
        if (!Number.isFinite(newSize) || newSize <= 0 || newSize === this.size()) {
            return;
        }
        // Розмір змінився — повертаємось на першу сторінку
        this.pageChange.emit({ offset: 0, size: newSize });
    }
}