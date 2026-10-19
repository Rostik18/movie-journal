import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';

import { MediaLinkType, MediaLinkTypeLabels, MediaType, MediaTypeLabels, Visibility, VisibilityLabels } from '../../../models/enums';
import { MediaCollectionResponse } from '../../../models/collection.model';
import { MediaService } from '../../../services/media.service';
import { ActorService } from '../../../services/actor.service';
import { CollectionService } from '../../../services/collection.service';
import { ToastService } from '../../../services/toast.service';
import { ServerService } from '../../../services/server-status.service';
import { CreateMediaRequest } from '../../../models/media.model';

type ActorId = CreateMediaRequest['cast'][number]['actorId'];
type CollectionId = NonNullable<CreateMediaRequest['collectionId']>;

interface ActorSearchItem {
    id?: ActorId;
    actorId?: ActorId;
    fullName: string;
    photoUrl?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;

const createEmptyMedia = (): CreateMediaRequest => ({
    title: '',
    originalTitle: '',
    author: null,
    type: MediaType.Movie,
    releaseYear: new Date().getFullYear(),
    runtimeMinutes: null,
    posterUrl: '',
    visibility: Visibility.Public,
    genres: [],
    tags: [],
    cast: [],
    links: [],
    seasons: [],
    collectionId: null
});

const parseCommaList = (value: string): string[] =>
    [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];

@Component({
    selector: 'app-media-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './media-form.component.html',
    styleUrls: ['./media-form.component.scss']
})
export class MediaFormComponent implements OnInit {
    private readonly mediaService = inject(MediaService);
    private readonly actorService = inject(ActorService);
    private readonly collectionService = inject(CollectionService);
    private readonly serverService = inject(ServerService);
    private readonly toastService = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    // ---- API компонента ----
    readonly embedded = input(false);

    /** Початкові значення (для вбудованого режиму), застосовуються один раз при створенні форми. */
    readonly initialUrl = input<string | null>(null);
    readonly initialTitle = input('');
    readonly mediaCreated = output<void>();
    readonly mediaCreatedWithData = output<any>();

    // ---- Стан форми ----
    mediaData: CreateMediaRequest = createEmptyMedia();
    genresInput = '';
    tagsInput = '';
    imageError = false;
    readonly isSubmitting = signal(false);

    readonly mediaTypeOptions = Object.values(MediaType).map(type => ({
        value: type,
        label: MediaTypeLabels[type]
    }));

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));

    readonly linkTypeOptions = Object.values(MediaLinkType)
        .filter((v): v is MediaLinkType => typeof v === 'number')
        .map(value => ({ value, label: MediaLinkTypeLabels[value] }));

    // ---- Посилання ----
    newLinkName = '';
    newLinkUrl = '';
    newLinkType: MediaLinkType = MediaLinkType.Other;

    // ---- Актори ----
    actorSearchQuery = '';
    readonly actorSearchResults = signal<ActorSearchItem[]>([]);
    private readonly actorQuery$ = new Subject<string>();

    // ---- Колекції ----
    collectionSearchQuery = '';
    readonly collectionSearchResults = signal<MediaCollectionResponse[]>([]);
    readonly hasSearchedOnce = signal(false);
    private readonly collectionQuery$ = new Subject<string>();

    constructor() {
        // debounce + switchMap: менше запитів і немає гонки відповідей
        this.actorQuery$.pipe(
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap(name => {
                if (!name) {
                    return of<ActorSearchItem[]>([]);
                }
                return this.actorService.searchActors({ name, size: 10 }).pipe(
                    map(res => (res.items ?? []) as ActorSearchItem[]),
                    catchError(err => {
                        console.error('Помилка пошуку акторів:', err);
                        return of<ActorSearchItem[]>([]);
                    })
                );
            }),
            takeUntilDestroyed()
        ).subscribe(items => this.actorSearchResults.set(items));

        this.collectionQuery$.pipe(
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap(query => {
                if (!query) {
                    return of<MediaCollectionResponse[] | null>(null);
                }
                return this.collectionService.searchCollections({ query, size: 5 }).pipe(
                    map(res => res.items ?? []),
                    catchError(err => {
                        console.error('Помилка пошуку колекцій:', err);
                        return of<MediaCollectionResponse[]>([]);
                    })
                );
            }),
            takeUntilDestroyed()
        ).subscribe(items => {
            if (items === null) {
                this.collectionSearchResults.set([]);
                this.hasSearchedOnce.set(false);
                return;
            }
            this.collectionSearchResults.set(items);
            this.hasSearchedOnce.set(true);

            // Точний збіг -> беремо існуючу колекцію, інакше буде створена нова
            const query = this.collectionSearchQuery.trim().toLowerCase();
            this.mediaData.collectionId = items.find(c => c.name.toLowerCase() === query)?.id ?? null;
        });
    }

    ngOnInit(): void {
        const title = this.initialTitle().trim();
        if (title) {
            this.mediaData.title = title;
        }

        const url = this.initialUrl();
        if (url) {
            this.initFromUrl(url);
        }
    }

    get isSeries(): boolean {
        return this.mediaData.type === MediaType.Series;
    }

    // ====================== Постер ======================
    onPosterUrlChange(): void {
        this.imageError = false;
    }

    // ====================== Посилання ======================
    /** Публічний метод для батьківського компонента (ініціалізація за URL). */
    initFromUrl(url: string): void {
        const trimmed = url?.trim();
        if (!trimmed) {
            return;
        }

        const isFirstLink = this.mediaData.links.length === 0;
        if (this.addLink(trimmed, null, MediaLinkType.Other) && isFirstLink) {
            this.loadMetadataForUrl(trimmed);
        }
    }

    /** Викликається на blur та Enter у полі посилання. */
    onLinkCommit(event?: Event): void {
        event?.preventDefault();

        const url = this.newLinkUrl.trim();
        if (!url) {
            return;
        }

        const isFirstLink = this.mediaData.links.length === 0;
        const name = this.newLinkName.trim() || null;
        if (!this.addLink(url, name, this.newLinkType)) {
            return;
        }

        this.newLinkUrl = '';
        this.newLinkName = '';

        // Метадані підтягуємо лише для першого посилання
        if (isFirstLink) {
            this.loadMetadataForUrl(url);
        }
    }

    removeLink(index: number): void {
        this.mediaData.links.splice(index, 1);
    }

    private addLink(url: string, name: string | null, type: MediaLinkType): boolean {
        if (!this.isValidUrl(url)) {
            this.toastService.show('Некоректне посилання.', 'error', 3000);
            return false;
        }
        if (this.mediaData.links.some(l => l.url === url)) {
            this.toastService.show('Це посилання вже додано.', 'info', 3000);
            return false;
        }
        this.mediaData.links.push({ name, url, type });
        return true;
    }

    private isValidUrl(value: string): boolean {
        try {
            const { protocol } = new URL(value);
            return protocol === 'http:' || protocol === 'https:';
        } catch {
            return false;
        }
    }

    private loadMetadataForUrl(url: string): void {
        this.toastService.show('Аналіз посилання та завантаження метаданих...', 'info', 3000);

        this.serverService.getMetadata(url).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: meta => {
                if (!meta) {
                    return;
                }
                if (meta.title && !this.mediaData.title?.trim()) {
                    this.mediaData.title = meta.title;
                }
                if (meta.image && !this.mediaData.posterUrl?.trim()) {
                    this.mediaData.posterUrl = meta.image;
                    this.imageError = false;
                }
                this.cdr.markForCheck();
                this.toastService.show('Метадані успішно завантажено! ✨', 'success', 3000);
            },
            error: err => {
                console.error('Помилка отримання метаданих за URL:', err);
                this.toastService.show('Не вдалося завантажити метадані за посиланням.', 'error', 4000);
            }
        });
    }

    // ====================== Актори ======================
    onSearchActors(): void {
        const query = this.actorSearchQuery.trim();
        if (!query) {
            this.actorSearchResults.set([]);
        }
        this.actorQuery$.next(query);
    }

    addActorToCast(actor: ActorSearchItem): void {
        const actorId = (actor.id ?? actor.actorId) as ActorId;
        if (!this.mediaData.cast.some(a => a.actorId === actorId)) {
            this.mediaData.cast.push({ actorId, fullName: actor.fullName, characterName: '' });
        }
        this.actorSearchQuery = '';
        this.actorSearchResults.set([]);
        this.actorQuery$.next('');
    }

    removeActor(index: number): void {
        this.mediaData.cast.splice(index, 1);
    }

    // ====================== Колекції ======================
    onSearchCollections(): void {
        const query = this.collectionSearchQuery.trim();

        // Текст змінився -> попередній вибір більше не актуальний
        this.mediaData.collectionId = null;
        this.hasSearchedOnce.set(false);
        if (!query) {
            this.collectionSearchResults.set([]);
        }
        this.collectionQuery$.next(query);
    }

    selectCollection(col: MediaCollectionResponse): void {
        this.mediaData.collectionId = col.id;
        this.collectionSearchQuery = col.name;
        this.collectionSearchResults.set([]);
    }

    clearCollection(): void {
        this.mediaData.collectionId = null;
        this.collectionSearchQuery = '';
        this.collectionSearchResults.set([]);
        this.hasSearchedOnce.set(false);
        this.collectionQuery$.next('');
    }

    // ====================== Сезони та епізоди ======================
    addSeason(): void {
        this.mediaData.seasons.push({ number: this.mediaData.seasons.length + 1, episodes: [] });
    }

    removeSeason(index: number): void {
        this.mediaData.seasons.splice(index, 1);
        // Перенумеровуємо, щоб не було дублів/пропусків
        this.mediaData.seasons.forEach((s, i) => (s.number = i + 1));
    }

    addEpisode(seasonIndex: number): void {
        const season = this.mediaData.seasons[seasonIndex];
        season.episodes.push({ number: season.episodes.length + 1, title: '' });
    }

    removeEpisode(seasonIndex: number, epIndex: number): void {
        const season = this.mediaData.seasons[seasonIndex];
        season.episodes.splice(epIndex, 1);
        season.episodes.forEach((e, i) => (e.number = i + 1));
    }

    // ====================== Збереження ======================
    /** Публічний метод: його можна викликати з батьківського компонента в embedded-режимі. */
    submit(): void {
        if (this.isSubmitting()) {
            return;
        }
        if (!this.mediaData.title.trim()) {
            this.toastService.show('Будь ласка, введіть назву медіа.', 'error');
            return;
        }
        if (!this.mediaData.releaseYear) {
            this.toastService.show('Будь ласка, вкажіть рік випуску.', 'error');
            return;
        }

        this.isSubmitting.set(true);

        this.resolveCollectionId().pipe(
            switchMap(collectionId => this.mediaService.createMedia(this.buildPayload(collectionId))),
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: created => this.onCreated(created),
            error: err => {
                console.error('Помилка створення медіа:', err);
                this.toastService.show(`Не вдалося створити медіа "${this.mediaData.title}".`, 'error', 6000);
            }
        });
    }

    /** @deprecated Використовуйте submit(). Залишено для зворотної сумісності. */
    onSubmitStandalone(): void {
        this.submit();
    }

    private buildPayload(collectionId: CollectionId | null): CreateMediaRequest {
        return {
            ...this.mediaData,
            title: this.mediaData.title.trim(),
            author: this.mediaData.author?.trim() || null,
            genres: parseCommaList(this.genresInput),
            tags: parseCommaList(this.tagsInput),
            collectionId
        };
    }

    /**
     * Повертає id колекції: обраний, знайдений за точною назвою
     * (на випадок швидкого сабміту до завершення debounce) або щойно створений.
     */
    private resolveCollectionId(): Observable<CollectionId | null> {
        if (this.mediaData.collectionId) {
            return of(this.mediaData.collectionId as CollectionId);
        }

        const name = this.collectionSearchQuery.trim();
        if (!name) {
            return of(null);
        }

        return this.collectionService.searchCollections({ query: name, size: 5 }).pipe(
            map(res => (res.items ?? []).find(c => c.name.toLowerCase() === name.toLowerCase())),
            switchMap(existing =>
                existing
                    ? of(existing.id as CollectionId)
                    : this.collectionService
                        .createCollection({ name, visibility: this.mediaData.visibility, tags: [] })
                        .pipe(map(created => created.id as CollectionId))
            ),
            catchError(err => {
                console.error('Помилка створення нової колекції:', err);
                this.toastService.show(`Не вдалося створити колекцію "${name}".`, 'error', 6000);
                return EMPTY;
            })
        );
    }

    private onCreated(created: any): void {
        const title = this.mediaData.title;
        this.toastService.show(`Медіа "${title}" успішно створено! 🎉`, 'success', 5000);

        if (this.embedded()) {
            this.mediaCreatedWithData.emit(created || this.mediaData);
        } else {
            this.mediaCreated.emit();
        }
        this.resetForm();
    }

    private resetForm(): void {
        this.mediaData = createEmptyMedia();
        this.genresInput = '';
        this.tagsInput = '';
        this.imageError = false;
        this.newLinkName = '';
        this.newLinkUrl = '';
        this.newLinkType = MediaLinkType.Other;
        this.actorSearchQuery = '';
        this.actorSearchResults.set([]);
        this.clearCollection();
    }
}