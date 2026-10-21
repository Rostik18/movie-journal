import { Component, DestroyRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';

import { MediaFormComponent } from '../media-form/media-form.component';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { MediaType, WatchStatus, WatchStatusLabels } from '../../../models/enums';
import { UserWatchingService } from '../../../services/user-watching.service';
import { MediaService } from '../../../services/media.service';
import { ToastService } from '../../../services/toast.service';
import { MediaItem } from '../../../models/media.model';
import { CreateUserWatchingRequest } from '../../../models/user-watching.model';

type SearchOutcome =
    | { kind: 'empty' }
    | { kind: 'url'; url: string }
    | { kind: 'items'; query: string; items: MediaItem[] };

const SEARCH_DEBOUNCE_MS = 300;

const createEmptyWatching = (): CreateUserWatchingRequest => ({
    mediaId: '',
    status: WatchStatus.Watching,
    rating: null,
    notes: '',
    stoppedAtSeconds: null,
    currentSeasonNumber: null,
    currentEpisodeNumber: null
});

@Component({
    selector: 'app-user-watching-form',
    standalone: true,
    imports: [FormsModule, MediaFormComponent, RatingStarsComponent],
    templateUrl: './user-watching-form.component.html',
    styleUrls: ['./user-watching-form.component.scss']
})
export class UserWatchingFormComponent {
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly mediaService = inject(MediaService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly watchingCreated = output<void>();

    private readonly mediaForm = viewChild(MediaFormComponent);

    formData: CreateUserWatchingRequest = createEmptyWatching();

    // Робимо WatchStatus доступним у шаблоні
    readonly WatchStatus = WatchStatus;

    readonly statusOptions = Object.values(WatchStatus).map(type => ({
        value: type,
        label: WatchStatusLabels[type]
    }));

    // ---- Пошук / вибір медіа ----
    mediaSearchQuery = '';
    selectedMediaTitle = '';
    readonly mediaSearchResults = signal<MediaItem[]>([]);
    readonly hasSearched = signal(false);
    private readonly mediaQuery$ = new Subject<string>();

    // ---- Створення нового медіа (вбудована форма) ----
    readonly isCreatingNewMedia = signal(false);
    readonly newMediaUrl = signal<string | null>(null);
    readonly newMediaTitle = signal('');

    // ---- Стан збереження ----
    private readonly isSavingWatching = signal(false);
    readonly isBusy = computed(
        () => this.isSavingWatching() || (this.mediaForm()?.isSubmitting() ?? false)
    );

    selectedMediaType: MediaType | null = null;

    // Геттер та сеттер для конвертації хвилин у секунди та навпаки
    get stoppedAtMinutes(): number | null {
        return this.formData.stoppedAtSeconds != null
            ? Math.round(this.formData.stoppedAtSeconds / 60)
            : null;
    }

    set stoppedAtMinutes(value: number | null) {
        this.formData.stoppedAtSeconds = value != null && !isNaN(value)
            ? Math.round(value * 60)
            : null;
    }

    // чи показувати сезон/епізод
    get showProgressFields(): boolean {
        return this.isCreatingNewMedia()
            ? (this.mediaForm()?.isSeries ?? false)
            : !!this.formData.mediaId && this.selectedMediaType === MediaType.Series;
    }

    constructor() {
        this.mediaQuery$.pipe(
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap((query): Observable<SearchOutcome> => {
                if (!query) {
                    return of<SearchOutcome>({ kind: 'empty' });
                }
                if (this.isUrl(query)) {
                    return of<SearchOutcome>({ kind: 'url', url: query });
                }
                return this.mediaService.searchMedia({ title: query, size: 5 }).pipe(
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
        ).subscribe(outcome => this.applySearchOutcome(outcome));
    }

    // ====================== Пошук медіа ======================
    onMediaQueryChange(value: string): void {
        this.mediaSearchQuery = value;
        const query = value.trim();

        this.formData.mediaId = '';
        this.selectedMediaTitle = '';
        this.selectedMediaType = null;
        this.hasSearched.set(false);
        if (!query) {
            this.mediaSearchResults.set([]);
        }
        this.mediaQuery$.next(query);
    }

    selectMedia(media: MediaItem): void {
        this.formData.mediaId = media.id;
        this.mediaSearchQuery = media.title;
        this.selectedMediaTitle = media.title;
        this.selectedMediaType = media.type;
        this.mediaSearchResults.set([]);
    }

    clearMedia(): void {
        this.formData.mediaId = '';
        this.mediaSearchQuery = '';
        this.selectedMediaTitle = '';
        this.selectedMediaType = null;
        this.mediaSearchResults.set([]);
        this.hasSearched.set(false);
        this.mediaQuery$.next('');
    }

    private applySearchOutcome(outcome: SearchOutcome): void {
        switch (outcome.kind) {
            case 'empty':
                this.mediaSearchResults.set([]);
                this.hasSearched.set(false);
                break;

            case 'url':
                this.mediaSearchResults.set([]);
                this.startCreateNew(outcome.url);
                break;

            case 'items': {
                this.mediaSearchResults.set(outcome.items);
                this.hasSearched.set(true);

                const query = outcome.query.toLowerCase();
                const exactMatch = outcome.items.find(m => m.title.toLowerCase() === query);
                if (exactMatch) {
                    this.formData.mediaId = exactMatch.id;
                    this.selectedMediaTitle = exactMatch.title;
                    this.selectedMediaType = exactMatch.type;
                }
                break;
            }
        }
    }

    private isUrl(text: string): boolean {
        try {
            const { protocol } = new URL(text);
            return protocol === 'http:' || protocol === 'https:';
        } catch {
            return false;
        }
    }

    // ====================== Створення нового медіа ======================
    startCreateNew(url: string | null = null): void {
        this.newMediaUrl.set(url);
        this.newMediaTitle.set(url ? '' : this.mediaSearchQuery.trim());
        this.formData.mediaId = '';
        this.isCreatingNewMedia.set(true);
    }

    cancelCreateNew(): void {
        this.isCreatingNewMedia.set(false);

        if (this.newMediaUrl()) {
            this.clearMedia();
        }
        this.newMediaUrl.set(null);
        this.newMediaTitle.set('');
    }

    onNewMediaCreated(created: any): void {
        if (!created?.id) {
            this.toastService.show('Медіа створено, але сервер не повернув його ідентифікатор.', 'error', 6000);
            return;
        }

        this.formData.mediaId = created.id;
        this.selectedMediaTitle = created.title ?? this.mediaForm()?.mediaData.title ?? '';
        this.selectedMediaType = created.type ?? this.mediaForm()?.mediaData.type ?? null;
        this.mediaSearchQuery = this.selectedMediaTitle;
        this.newMediaUrl.set(null);
        this.newMediaTitle.set('');
        this.isCreatingNewMedia.set(false);

        this.saveToWatchlist();
    }

    // ====================== Збереження ======================
    onSubmit(): void {
        if (this.isBusy()) {
            return;
        }

        if (this.isCreatingNewMedia()) {
            this.mediaForm()?.submit();
            return;
        }

        if (!this.formData.mediaId) {
            this.toastService.show('Будь ласка, оберіть фільм або введіть URL / створіть новий.', 'error');
            return;
        }
        this.saveToWatchlist();
    }

    private saveToWatchlist(): void {
        this.isSavingWatching.set(true);

        // Очищаємо stoppedAtSeconds якщо статус не Watching
        if (this.formData.status !== WatchStatus.Watching) {
            this.formData.stoppedAtSeconds = null;
        }

        const payload = this.showProgressFields
            ? this.formData
            : { ...this.formData, currentSeasonNumber: null, currentEpisodeNumber: null };

        this.userWatchingService.createOrUpdateWatchlist(payload).pipe(
            finalize(() => this.isSavingWatching.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show('Успішно додано до списку перегляду! 🎉', 'success', 4000);
                this.watchingCreated.emit();
                this.resetForm();
            },
            error: err => {
                console.error('Помилка додавання до списку перегляду:', err);
                this.toastService.show('Не вдалося додати до списку перегляду.', 'error', 6000);
            }
        });
    }

    private resetForm(): void {
        this.formData = createEmptyWatching();
        this.clearMedia();
    }
}