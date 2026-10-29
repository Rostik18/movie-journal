import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Поле «знайти існуючу сутність за назвою або ввести нову» (колекція, автор…).
 *
 * Компонент лише шукає й показує стан; нову сутність створює форма-власник при збереженні:
 * `query` — введений текст, `selectedId` — id існуючої сутності (null, якщо назва нова або порожня).
 */
@Component({
    selector: 'app-entity-picker',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './entity-picker.component.html',
    styleUrls: ['./entity-picker.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityPickerComponent<T extends { id: string; name: string }> {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly inputId = input.required<string>();
    readonly label = input.required<string>();
    readonly placeholder = input('');
    /** Емодзі перед назвою у випадаючому списку. */
    readonly icon = input('');
    /** Підказка, коли такої сутності немає й її буде створено при збереженні (далі йде назва в лапках). */
    readonly newHint = input.required<string>();
    readonly selectedHint = input.required<string>();
    /** Пошук за введеним текстом (не порожнім). */
    readonly search = input.required<(query: string) => Observable<T[]>>();

    readonly query = model('');
    readonly selectedId = model<string | null>(null);

    readonly results = signal<T[]>([]);
    readonly hasSearched = signal(false);

    private readonly query$ = new Subject<string>();

    constructor() {
        this.query$.pipe(
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap(query => {
                if (!query) {
                    return of<T[] | null>(null);
                }
                return this.search()(query).pipe(
                    catchError(err => {
                        console.error('Помилка пошуку:', err);
                        return of<T[]>([]);
                    })
                );
            }),
            takeUntilDestroyed()
        ).subscribe(items => {
            if (items === null) {
                this.results.set([]);
                this.hasSearched.set(false);
                return;
            }
            this.results.set(items);
            this.hasSearched.set(true);

            // Збіг за назвою без урахування регістру вважаємо вибором існуючої сутності
            const query = this.query().trim().toLowerCase();
            this.selectedId.set(items.find(item => item.name.toLowerCase() === query)?.id ?? null);
        });
    }

    /** Користувач друкує: попередній вибір скидається, поки пошук не підтвердить збіг. */
    onInput(value: string): void {
        this.query.set(value);
        this.selectedId.set(null);
        this.hasSearched.set(false);
        if (!value.trim()) {
            this.results.set([]);
        }
        this.query$.next(value.trim());
    }

    /** Шукає за поточним `query`, не скидаючи вибір (напр. після автозаповнення ззовні). */
    lookup(): void {
        this.query$.next(this.query().trim());
    }

    select(item: T): void {
        this.selectedId.set(item.id);
        this.query.set(item.name);
        this.results.set([]);
    }

    clear(): void {
        this.selectedId.set(null);
        this.query.set('');
        this.results.set([]);
        this.hasSearched.set(false);
        this.query$.next('');
    }

    /** Escape закриває лише список (і не доходить до модалки, яка інакше закрилась би). */
    onEscape(event: Event): void {
        if (this.results().length > 0) {
            event.stopPropagation();
            this.results.set([]);
        }
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent): void {
        if (this.results().length > 0 && !this.host.nativeElement.contains(event.target as Node)) {
            this.results.set([]);
        }
    }
}