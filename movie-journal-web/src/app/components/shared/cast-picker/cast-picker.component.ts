import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { ActorService } from '../../../services/actor.service';
import { MediaActor } from '../../../models/media.model';

const SEARCH_DEBOUNCE_MS = 300;
const MAX_SEARCH_RESULTS = 10;

interface ActorSearchItem {
    id: string;
    fullName: string;
    photoUrl?: string | null;
}

/** Акторський склад: пошук акторів і список обраних із полем «ім'я персонажа». */
@Component({
    selector: 'app-cast-picker',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './cast-picker.component.html',
    styleUrls: ['./cast-picker.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CastPickerComponent {
    private readonly actorService = inject(ActorService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** Обраний склад; змінюється лише імутабельно (нові масиви), тож працює як двостороння прив'язка. */
    readonly cast = model<MediaActor[]>([]);

    readonly searchQuery = signal('');
    readonly results = signal<ActorSearchItem[]>([]);
    private readonly query$ = new Subject<string>();

    constructor() {
        this.query$.pipe(
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap(query => {
                if (!query) {
                    return of<ActorSearchItem[]>([]);
                }
                return this.actorService.searchActors({ query, size: MAX_SEARCH_RESULTS }).pipe(
                    map(res => (res.items ?? []) as ActorSearchItem[]),
                    catchError(err => {
                        console.error('Помилка пошуку акторів:', err);
                        return of<ActorSearchItem[]>([]);
                    })
                );
            }),
            takeUntilDestroyed()
        ).subscribe(items => this.results.set(items));
    }

    onSearch(value: string): void {
        this.searchQuery.set(value);
        const query = value.trim();
        if (!query) {
            this.results.set([]);
        }
        this.query$.next(query);
    }

    add(actor: ActorSearchItem): void {
        if (!this.cast().some(member => member.actorId === actor.id)) {
            this.cast.update(list => [...list, { actorId: actor.id, fullName: actor.fullName, characterName: '' }]);
        }
        this.searchQuery.set('');
        this.results.set([]);
        this.query$.next('');
    }

    remove(index: number): void {
        this.cast.update(list => list.filter((_, i) => i !== index));
    }

    setCharacterName(index: number, name: string): void {
        this.cast.update(list => list.map((member, i) => (i === index ? { ...member, characterName: name } : member)));
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