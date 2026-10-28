import { Component, OnInit, inject, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { MediaType } from '../../../models/enums';
import { MediaItem } from '../../../models/media.model';
import { MediaService } from '../../../services/media.service';
import { ToastService } from '../../../services/toast.service';
import { isHttpUrl } from '../../../utils/form-parse.util';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_SIZE = 5;

/** Обраний фільм: достатньо для заголовка та вибору полів прогресу. */
export interface PickedMedia {
    id: string;
    title: string;
    type: MediaType | null;
}

/** Що передати формі створення нового медіа: посилання (вставили URL) або назва (не знайшли в базі). */
export interface CreateMediaRequestEvent {
    url: string | null;
    title: string;
}

type SearchOutcome =
    | { kind: 'empty' }
    | { kind: 'url'; url: string }
    | { kind: 'items'; query: string; items: MediaItem[] };

/**
 * Пошук існуючого фільму за назвою. Вставлене посилання або кнопка «Створити новий фільм»
 * не створюють нічого самі, а повідомляють про це через `createNew`.
 */
@Component({
    selector: 'app-media-picker',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './media-picker.component.html',
    styleUrls: ['./media-picker.component.scss']
})
export class MediaPickerComponent implements OnInit {
    private readonly mediaService = inject(MediaService);
    private readonly toastService = inject(ToastService);

    /** Введений текст (живе у формі-власнику, тому переживає перемикання на форму створення). */
    readonly query = model('');
    readonly selected = model<PickedMedia | null>(null);
    readonly createNew = output<CreateMediaRequestEvent>();

    readonly results = signal<MediaItem[]>([]);
    readonly hasSearched = signal(false);

    private readonly query$ = new Subject<string>();

    constructor() {
        this.query$.pipe(
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap((query): Observable<SearchOutcome> => {
                if (!query) {
                    return of<SearchOutcome>({ kind: 'empty' });
                }
                if (isHttpUrl(query)) {
                    return of<SearchOutcome>({ kind: 'url', url: query });
                }
                return this.mediaService.searchMedia({ query, size: SEARCH_SIZE }).pipe(
                    map((res): SearchOutcome => ({
                        kind: 'items',
                        query,
                        items: (res.items ?? []) as MediaItem[]
                    })),
                    catchError(err => {
                        console.error('Помилка пошуку медіа:', err);
                        this.toastService.show('Не вдалося виконати пошук.', 'error', 4000);
                        return of<SearchOutcome>({ kind: 'empty' });
                    })
                );
            }),
            takeUntilDestroyed()
        ).subscribe(outcome => this.applyOutcome(outcome));
    }

    ngOnInit(): void {
        // Після повернення з форми створення (скасування) відновлюємо результати пошуку за збереженим текстом
        if (this.query().trim() && !this.selected()) {
            this.query$.next(this.query().trim());
        }
    }

    onInput(value: string): void {
        this.query.set(value);
        const query = value.trim();

        this.selected.set(null);
        this.hasSearched.set(false);
        if (!query) {
            this.results.set([]);
        }
        this.query$.next(query);
    }

    select(media: MediaItem): void {
        this.selected.set({ id: media.id, title: media.title, type: media.type });
        this.query.set(media.title);
        this.results.set([]);
    }

    clear(): void {
        this.selected.set(null);
        this.query.set('');
        this.results.set([]);
        this.hasSearched.set(false);
        this.query$.next('');
    }

    startCreate(): void {
        this.createNew.emit({ url: null, title: this.query().trim() });
    }

    private applyOutcome(outcome: SearchOutcome): void {
        switch (outcome.kind) {
            case 'empty':
                this.results.set([]);
                this.hasSearched.set(false);
                break;

            case 'url':
                this.results.set([]);
                this.createNew.emit({ url: outcome.url, title: '' });
                break;

            case 'items': {
                this.results.set(outcome.items);
                this.hasSearched.set(true);

                const query = outcome.query.toLowerCase();
                const exactMatch = outcome.items.find(m => m.title.toLowerCase() === query);
                if (exactMatch) {
                    this.selected.set({ id: exactMatch.id, title: exactMatch.title, type: exactMatch.type });
                }
                break;
            }
        }
    }
}