import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Клікабельний тег або жанр: веде на /movies з готовим пошуком («тег:космос» / «жанр:драма»).
 * Вигляд (кольори, відступи) беруться з глобальних класів .tag-chip / .genre-tag.
 */
@Component({
    selector: 'app-search-chip',
    standalone: true,
    imports: [RouterLink],
    template: `
        <a [class]="chipClass()" [routerLink]="['/movies']" [queryParams]="{ q: searchText() }"
            [title]="hint()" (click)="$event.stopPropagation()">{{ label() }}</a>
    `,
    styles: `:host { display: inline-flex; }`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchChipComponent {
    readonly kind = input.required<'tag' | 'genre'>();
    readonly value = input.required<string>();

    readonly chipClass = computed(() => (this.kind() === 'tag' ? 'tag-chip' : 'genre-tag'));
    readonly label = computed(() => (this.kind() === 'tag' ? `#${this.value()}` : this.value()));
    /** Рядок для поля пошуку у списку фільмів (розбирається utils/search-query.ts). */
    readonly searchText = computed(() => `${this.kind() === 'tag' ? 'тег' : 'жанр'}:${this.value()}`);
    readonly hint = computed(() => `Показати фільми: ${this.kind() === 'tag' ? 'тег' : 'жанр'} «${this.value()}»`);
}