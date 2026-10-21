import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';

import { MediaLinkType, MediaType, MediaTypeLabels, Visibility, VisibilityLabels } from '../../../models/enums';
import { MediaCollectionResponse } from '../../../models/collection.model';
import { MediaService } from '../../../services/media.service';
import { ActorService } from '../../../services/actor.service';
import { CollectionService } from '../../../services/collection.service';
import { ToastService } from '../../../services/toast.service';
import { ServerService } from '../../../services/server.service';
import { CreateMediaRequest } from '../../../models/media.model';

type ActorId = CreateMediaRequest['cast'][number]['actorId'];
type CollectionId = NonNullable<CreateMediaRequest['collectionId']>;

type MediaMetadata = ReturnType<ServerService['getMetadata']> extends Observable<infer T> ? T : never;

interface ActorSearchItem {
    id?: ActorId;
    actorId?: ActorId;
    fullName: string;
    photoUrl?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_RELEASE_YEAR = 1888;
const MAX_RELEASE_YEAR = 2100;
const MAX_AUTO_TAGS = 10;

const createEmptyMedia = (): CreateMediaRequest => ({
    title: '',
    originalTitle: '',
    author: null,
    type: MediaType.Movie,
    releaseYear: null, // Тепер опціонально (за замовчуванням null)
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
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly embedded = input(false);
    readonly initialUrl = input<string | null>(null);
    readonly initialTitle = input('');
    readonly mediaCreated = output<void>();
    readonly mediaCreatedWithData = output<any>();

    mediaData: CreateMediaRequest = createEmptyMedia();
    genresInput = '';
    tagsInput = '';
    imageError = false;
    readonly isSubmitting = signal(false);

    private typeTouched = false;

    readonly mediaTypeOptions = Object.values(MediaType).map(type => ({
        value: type,
        label: MediaTypeLabels[type]
    }));

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));

    // ---- Посилання (Name та Type приховані) ----
    newLinkUrl = '';
    private metadataSub: Subscription | null = null;

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

    onFormEnter(event: Event): void {
        if ((event.target as HTMLElement).tagName === 'INPUT') {
            event.preventDefault();
        }
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent): void {
        const target = event.target as Element | null;
        if (!target) {
            return;
        }

        if (this.collectionSearchResults().length > 0 && !this.isInside(target, '.collection-section')) {
            this.collectionSearchResults.set([]);
        }
        if (this.actorSearchResults().length > 0 && !this.isInside(target, '.actor-search-box')) {
            this.actorSearchResults.set([]);
        }
    }

    private isInside(target: Element, selector: string): boolean {
        const container = target.closest(selector);
        return !!container && this.host.nativeElement.contains(container);
    }

    onTypeChange(type: MediaType): void {
        this.mediaData.type = type;
        this.typeTouched = true;
    }

    onPosterUrlChange(): void {
        this.imageError = false;
    }

    initFromUrl(url: string): void {
        const trimmed = url?.trim();
        if (!trimmed) {
            return;
        }

        const isFirstLink = this.mediaData.links.length === 0;
        if (this.addLink(trimmed) && isFirstLink) {
            this.loadMetadataForUrl(trimmed);
        }
    }

    onLinkCommit(event?: Event): void {
        event?.preventDefault();

        const url = this.newLinkUrl.trim();
        if (!url) {
            return;
        }

        const isFirstLink = this.mediaData.links.length === 0;
        if (!this.addLink(url)) {
            return;
        }

        this.newLinkUrl = '';

        if (isFirstLink) {
            this.loadMetadataForUrl(url);
        }
    }

    removeLink(index: number): void {
        this.mediaData.links.splice(index, 1);
    }

    private addLink(url: string): boolean {
        if (!this.isValidUrl(url)) {
            this.toastService.show('Некоректне посилання.', 'error', 3000);
            return false;
        }
        if (this.mediaData.links.some(l => l.url === url)) {
            this.toastService.show('Це посилання вже додано.', 'info', 3000);
            return false;
        }
        // name та type приховані, передаємо дефолтні значення відповідно до вимог
        this.mediaData.links.push({ name: null, url, type: MediaLinkType.Other });
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

        this.metadataSub?.unsubscribe();
        this.metadataSub = this.serverService.getMetadata(url).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: meta => {
                if (!meta) {
                    return;
                }

                const filled = this.applyMetadata(meta);
                this.cdr.markForCheck();

                if (filled.length > 0) {
                    this.toastService.show(`Метадані завантажено. Заповнено: ${filled.join(', ')} ✨`, 'success', 4000);
                } else {
                    this.toastService.show('Нових даних для автозаповнення не знайдено.', 'info', 3000);
                }
            },
            error: err => {
                console.error('Помилка отримання метаданих за URL:', err);
                this.toastService.show('Не вдалося завантажити метадані за посиланням.', 'error', 4000);
            }
        });
    }

    private applyMetadata(meta: MediaMetadata): string[] {
        const filled: string[] = [];
        const data = this.mediaData;

        if (meta.title && !data.title?.trim()) {
            data.title = meta.title.trim();
            filled.push('назва');
        }

        if (meta.image && !data.posterUrl?.trim()) {
            data.posterUrl = meta.image;
            this.imageError = false;
            filled.push('постер');
        }

        if (meta.author && !data.author?.trim()) {
            data.author = meta.author.trim();
            filled.push('автор');
        }

        const minutes = this.secondsToMinutes(meta.durationSeconds);
        if (minutes !== null && !data.runtimeMinutes) {
            data.runtimeMinutes = minutes;
            filled.push('тривалість');
        }

        if (
            meta.mediaType != null &&
            !this.typeTouched &&
            data.type !== meta.mediaType &&
            this.mediaTypeOptions.some(o => o.value === meta.mediaType)
        ) {
            data.type = meta.mediaType;
            filled.push('тип');
        }

        if (this.mergeTags(meta.tags)) {
            filled.push('теги');
        }

        return filled;
    }

    private secondsToMinutes(seconds?: number | null): number | null {
        return seconds && seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : null;
    }

    private mergeTags(incoming?: string[] | null): boolean {
        if (!incoming?.length) {
            return false;
        }

        const existing = parseCommaList(this.tagsInput);
        const seen = new Set(existing.map(t => t.toLowerCase()));
        const added: string[] = [];

        for (const raw of incoming) {
            const tag = raw.replace(/,/g, ' ').trim();
            const key = tag.toLowerCase();
            if (!tag || seen.has(key)) {
                continue;
            }
            seen.add(key);
            added.push(tag);
            if (added.length >= MAX_AUTO_TAGS) {
                break;
            }
        }

        if (added.length === 0) {
            return false;
        }

        this.tagsInput = [...existing, ...added].join(', ');
        return true;
    }

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

    onActorEscape(event: Event): void {
        if (this.actorSearchResults().length > 0) {
            event.stopPropagation();
            this.actorSearchResults.set([]);
        }
    }

    onSearchCollections(): void {
        const query = this.collectionSearchQuery.trim();

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

    onCollectionEscape(event: Event): void {
        if (this.collectionSearchResults().length > 0) {
            event.stopPropagation();
            this.collectionSearchResults.set([]);
        }
    }

    addSeason(): void {
        this.mediaData.seasons.push({ number: this.mediaData.seasons.length + 1, episodes: [] });
    }

    removeSeason(index: number): void {
        this.mediaData.seasons.splice(index, 1);
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

    submit(): void {
        if (this.isSubmitting() || !this.validate()) {
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

    onSubmitStandalone(): void {
        this.submit();
    }

    private validate(): boolean {
        const { title, releaseYear, runtimeMinutes, posterUrl } = this.mediaData;

        if (!title.trim()) {
            this.toastService.show('Будь ласка, введіть назву медіа.', 'error');
            return false;
        }
        // releaseYear тепер опціональний, але якщо введений — перевіряємо його межі
        if (releaseYear != null && (releaseYear < MIN_RELEASE_YEAR || releaseYear > MAX_RELEASE_YEAR)) {
            this.toastService.show(`Рік випуску має бути між ${MIN_RELEASE_YEAR} та ${MAX_RELEASE_YEAR}.`, 'error');
            return false;
        }
        if (runtimeMinutes != null && runtimeMinutes < 1) {
            this.toastService.show('Тривалість має бути більшою за 0 хвилин.', 'error');
            return false;
        }
        if (posterUrl?.trim() && !this.isValidUrl(posterUrl.trim())) {
            this.toastService.show('Некоректне посилання на постер.', 'error');
            return false;
        }
        return true;
    }

    private buildPayload(collectionId: CollectionId | null): CreateMediaRequest {
        return {
            ...this.mediaData,
            title: this.mediaData.title.trim(),
            originalTitle: (this.mediaData.originalTitle ?? '').trim(),
            posterUrl: (this.mediaData.posterUrl ?? '').trim(),
            author: this.mediaData.author?.trim() || null,
            genres: parseCommaList(this.genresInput),
            tags: parseCommaList(this.tagsInput),
            cast: this.mediaData.cast.map(c => ({ ...c, characterName: (c.characterName ?? '').trim() })),
            seasons: this.isSeries ? this.mediaData.seasons : [],
            collectionId
        };
    }

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
        this.metadataSub?.unsubscribe();
        this.metadataSub = null;

        this.mediaData = createEmptyMedia();
        this.typeTouched = false;
        this.genresInput = '';
        this.tagsInput = '';
        this.imageError = false;
        this.newLinkUrl = '';
        this.actorSearchQuery = '';
        this.actorSearchResults.set([]);
        this.clearCollection();
    }
}