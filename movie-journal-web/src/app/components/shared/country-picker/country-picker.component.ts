import { Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { COUNTRIES, MAX_NATIONALITIES, countryFlag, countryName } from '../../../utils/country.util';

const MAX_VISIBLE_MATCHES = 50;

/**
 * Вибір країн (громадянство). Значення — масив ISO alpha-3 кодів: ['USA'], ['NLD', 'FRA'].
 * Двосторонній binding: `[value]="..." (valueChange)="..."`.
 */
@Component({
    selector: 'app-country-picker',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './country-picker.component.html',
    styleUrls: ['./country-picker.component.scss']
})
export class CountryPickerComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly value = model<string[]>([]);
    readonly max = input(MAX_NATIONALITIES);
    readonly inputId = input('nationality');

    readonly query = signal('');
    readonly isOpen = signal(false);

    readonly selected = computed(() =>
        this.value().map(code => ({ code, name: countryName(code), flag: countryFlag(code) }))
    );

    readonly canAdd = computed(() => this.selected().length < this.max());

    readonly matches = computed(() => {
        const q = this.query().trim().toLowerCase();
        const taken = new Set(this.selected().map(c => c.code));

        return COUNTRIES
            .filter(c => !taken.has(c.code) && (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)))
            .slice(0, MAX_VISIBLE_MATCHES);
    });

    onQueryChange(text: string): void {
        this.query.set(text);
        this.isOpen.set(true);
    }

    add(code: string): void {
        const codes = this.value();
        if (codes.length >= this.max() || codes.includes(code)) {
            return;
        }
        this.value.set([...codes, code]);
        this.query.set('');
        this.isOpen.set(false);
    }

    remove(code: string): void {
        this.value.set(this.value().filter(c => c !== code));
    }

    /** Enter не сабмітить форму, а обирає першу країну зі списку. */
    onEnter(event: Event): void {
        event.preventDefault();
        const first = this.matches()[0];
        if (this.isOpen() && first) {
            this.add(first.code);
        }
    }

    /** Escape закриває лише список (інакше модалка закрилась би разом із ним). */
    onEscape(event: Event): void {
        if (this.isOpen()) {
            event.stopPropagation();
            this.isOpen.set(false);
        }
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent): void {
        if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
            this.isOpen.set(false);
        }
    }
}