import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { MediaType, MediaTypeLabels, Visibility, VisibilityLabels } from '../../../models/enums';
import { MediaCollectionResponse } from '../../../models/collection.model';
import { CreatorResponse } from '../../../models/creator.model';
import { MediaService } from '../../../services/media.service';
import { CollectionService } from '../../../services/collection.service';
import { CreatorService } from '../../../services/creator.service';
import { ToastService } from '../../../services/toast.service';
import { ServerService } from '../../../services/server.service';
import { CreateMediaRequest, MediaActor, MediaItem, MediaSidebar, Season, UpdateMediaRequest } from '../../../models/media.model';
import { createDirtyTracker } from '../../../utils/form-diff';
import { isHttpUrl, parseCommaList } from '../../../utils/form-parse.util';
import { CastPickerComponent } from '../cast-picker/cast-picker.component';
import { EntityPickerComponent } from '../entity-picker/entity-picker.component';
import { SeasonsEditorComponent } from '../seasons-editor/seasons-editor.component';

type CollectionId = NonNullable<CreateMediaRequest['collectionId']>;
type CreatorId = NonNullable<CreateMediaRequest['creatorId']>;

type MediaMetadata = ReturnType<ServerService['getMetadata']> extends Observable<infer T> ? T : never;

const MIN_RELEASE_YEAR = 1888;
const MAX_RELEASE_YEAR = 2100;
const MAX_AUTO_TAGS = 10;
const ENTITY_SEARCH_SIZE = 5;

/** Поля, які можна редагувати; порівнюються з baseline для dirty-check і payload. */
interface Snapshot {
    title: string;
    type: MediaType;
    description: string;
    originalTitle: string;
    releaseYear: number | null;
    duration: number | null;
    posterUrl: string;
    /** «id:…» — обраний автор, «new:…» — введене ім'я (буде знайдено/створено), порожньо — без автора. */
    creator: string;
    visibility: Visibility;
    genres: string;
    tags: string;
    links: string;
    cast: string;
    /** «id:…» — обрана колекція, «new:…» — введена назва (буде знайдена/створена), порожньо — без колекції. */
    collection: string;
}

/** Ключ вибору в EntityPicker: id існуючої сутності, нова назва або порожньо. */
const entityKey = (id: string | null, name: string): string => {
    if (id) {
        return `id:${id}`;
    }
    const trimmed = name.trim();
    return trimmed ? `new:${trimmed.toLowerCase()}` : '';
};

@Component({
    selector: 'app-media-form',
    standalone: true,
    imports: [FormsModule, EntityPickerComponent, CastPickerComponent, SeasonsEditorComponent],
    templateUrl: './media-form.component.html',
    styleUrls: ['./media-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaFormComponent implements OnInit {
    private readonly mediaService = inject(MediaService);
    private readonly collectionService = inject(CollectionService);
    private readonly creatorService = inject(CreatorService);
    private readonly serverService = inject(ServerService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly embedded = input(false);
    readonly initialUrl = input<string | null>(null);
    readonly initialTitle = input('');
    readonly mediaCreated = output<void>();
    /** Створене медіа (з id від сервера) — для вбудованої форми у списку перегляду. */
    readonly mediaCreatedWithData = output<MediaItem>();

    /** Якщо передано фільм — форма працює в режимі редагування. */
    readonly media = input<MediaSidebar | null>(null);
    readonly isEditMode = computed(() => this.media() !== null);
    /** Повертає збережену на сервері версію після успішного оновлення. */
    readonly mediaUpdated = output<MediaItem>();

    private readonly dirty = createDirtyTracker(() => this.snapshot());

    // ---- Поля форми (signals; у шаблоні — двосторонній [(ngModel)] на сигнал) ----
    readonly title = signal('');
    readonly originalTitle = signal('');
    readonly description = signal('');
    readonly type = signal<MediaType>(MediaType.Movie);
    readonly releaseYear = signal<number | null>(null);
    readonly duration = signal<number | null>(null);
    readonly posterUrl = signal('');
    readonly visibility = signal<Visibility>(Visibility.Public);
    readonly links = signal<string[]>([]);
    readonly genresInput = signal('');
    readonly tagsInput = signal('');
    readonly imageError = signal(false);
    readonly isSeries = computed(() => this.type() === MediaType.Series);
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
    readonly newLinkUrl = signal('');
    private metadataSub: Subscription | null = null;

    // ---- Актори та сезони (окремі компоненти) ----
    readonly cast = signal<MediaActor[]>([]);
    readonly seasons = signal<Season[]>([]);

    // ---- Колекція та автор: id існуючої сутності або введена назва (нову створюємо при збереженні) ----
    readonly collectionId = signal<string | null>(null);
    readonly collectionName = signal('');
    readonly creatorId = signal<string | null>(null);
    readonly creatorName = signal('');
    private readonly creatorPicker = viewChild<EntityPickerComponent<CreatorResponse>>('creatorPicker');

    readonly searchCollections = (query: string): Observable<MediaCollectionResponse[]> =>
        this.collectionService.searchCollections({ query, size: ENTITY_SEARCH_SIZE }).pipe(map(res => res.items ?? []));

    readonly searchCreators = (query: string): Observable<CreatorResponse[]> =>
        this.creatorService.searchCreators({ query, size: ENTITY_SEARCH_SIZE }).pipe(map(res => res.items ?? []));

    ngOnInit(): void {
        const media = this.media();
        if (media) {
            this.populateFrom(media);
            return;
        }

        // Порожня форма — точка відліку для hasChanges() у режимі створення
        this.dirty.markClean();

        const title = this.initialTitle().trim();
        if (title) {
            this.title.set(title);
        }

        const url = this.initialUrl();
        if (url) {
            this.initFromUrl(url);
        }
    }

    private populateFrom(media: MediaSidebar): void {
        this.title.set(media.title ?? '');
        this.description.set(media.description ?? '');
        this.originalTitle.set(media.originalTitle ?? '');
        this.type.set(media.type);
        this.releaseYear.set(media.releaseYear ?? null);
        this.duration.set(media.duration ?? null);
        this.posterUrl.set(media.posterUrl ?? '');
        this.visibility.set(media.visibility);
        this.links.set([...(media.links ?? [])]);
        this.cast.set((media.cast ?? []).map(c => ({
            actorId: c.id,
            fullName: c.fullName,
            characterName: c.characterName ?? ''
        })));
        // Імена автора й колекції приходять разом з медіа — окремий запит не потрібен
        this.creatorId.set(media.creator?.id ?? null);
        this.creatorName.set(media.creator?.name ?? '');
        this.collectionId.set(media.collection?.id ?? null);
        this.collectionName.set(media.collection?.name ?? '');
        this.genresInput.set((media.genres ?? []).join(', '));
        this.tagsInput.set((media.tags ?? []).join(', '));
        this.imageError.set(false);
        // Автозаповнення з метаданих не повинно перезаписувати тип існуючого запису
        this.typeTouched = true;
        this.dirty.markClean();
    }

    private snapshot(): Snapshot {
        return {
            title: this.title().trim(),
            type: this.type(),
            description: this.description().trim(),
            originalTitle: this.originalTitle().trim(),
            releaseYear: this.releaseYear() ?? null,
            duration: this.duration() ?? null,
            posterUrl: this.posterUrl().trim(),
            creator: entityKey(this.creatorId(), this.creatorName()),
            visibility: this.visibility(),
            genres: parseCommaList(this.genresInput()).join('\u0000'),
            tags: parseCommaList(this.tagsInput()).join('\u0000'),
            links: this.links().join('\u0000'),
            cast: this.cast().map(c => `${c.actorId}:${(c.characterName ?? '').trim()}`).join('\u0000'),
            collection: entityKey(this.collectionId(), this.collectionName())
        };
    }

    /** У редагуванні — чи змінилось щось відносно збереженого запису; у створенні завжди true. */
    hasChanges(): boolean {
        return this.dirty.hasChanges();
    }

    onFormEnter(event: Event): void {
        if ((event.target as HTMLElement).tagName === 'INPUT') {
            event.preventDefault();
        }
    }

    onTypeChange(type: MediaType): void {
        this.type.set(type);
        this.typeTouched = true;
    }

    onPosterUrlChange(): void {
        this.imageError.set(false);
    }

    initFromUrl(url: string): void {
        const trimmed = url?.trim();
        if (!trimmed) {
            return;
        }

        const isFirstLink = this.links().length === 0;
        if (this.addLink(trimmed) && isFirstLink) {
            this.loadMetadataForUrl(trimmed);
        }
    }

    onLinkCommit(event?: Event): void {
        event?.preventDefault();

        const url = this.newLinkUrl().trim();
        if (!url) {
            return;
        }

        const isFirstLink = this.links().length === 0;
        if (!this.addLink(url)) {
            return;
        }

        this.newLinkUrl.set('');

        if (isFirstLink) {
            this.loadMetadataForUrl(url);
        }
    }

    removeLink(index: number): void {
        this.links.update(list => list.filter((_, i) => i !== index));
    }

    private addLink(url: string): boolean {
        if (!isHttpUrl(url)) {
            this.toastService.show('Некоректне посилання.', 'error', 3000);
            return false;
        }
        if (this.links().includes(url)) {
            this.toastService.show('Це посилання вже додано.', 'info', 3000);
            return false;
        }
        this.links.update(list => [...list, url]);
        return true;
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
        if (meta.title && !this.title().trim()) {
            this.title.set(meta.title.trim());
            filled.push('назва');
        }

        if (meta.image && !this.posterUrl().trim()) {
            this.posterUrl.set(meta.image);
            this.imageError.set(false);
            filled.push('постер');
        }

        if (meta.author && !this.creatorId() && !this.creatorName().trim()) {
            this.creatorName.set(meta.author.trim());
            this.creatorPicker()?.lookup(); // підхопить існуючого автора з таким ім'ям, інакше буде створено нового
            filled.push('автор');
        }

        if (meta.durationSeconds && meta.durationSeconds > 0) {
            this.duration.set(meta.durationSeconds);
            filled.push('тривалість');
        }

        if (
            meta.mediaType != null &&
            !this.typeTouched &&
            this.type() !== meta.mediaType &&
            this.mediaTypeOptions.some(o => o.value === meta.mediaType)
        ) {
            this.type.set(meta.mediaType);
            filled.push('тип');
        }

        if (this.mergeTags(meta.tags)) {
            filled.push('теги');
        }

        return filled;
    }

    private mergeTags(incoming?: string[] | null): boolean {
        if (!incoming?.length) {
            return false;
        }

        const existing = parseCommaList(this.tagsInput());
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

        this.tagsInput.set([...existing, ...added].join(', '));
        return true;
    }

    submit(): void {
        if (this.isEditMode()) {
            this.update();
            return;
        }

        if (this.isSubmitting() || !this.validate()) {
            return;
        }

        this.isSubmitting.set(true);

        forkJoin([this.resolveCollectionId(), this.resolveCreatorId()]).pipe(
            switchMap(([collectionId, creatorId]) => this.mediaService.createMedia(this.buildPayload(collectionId, creatorId))),
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: created => this.onCreated(created),
            error: err => {
                console.error('Помилка створення медіа:', err);
                this.toastService.show(`Не вдалося створити медіа "${this.title()}".`, 'error', 6000);
            }
        });
    }

    private update(): void {
        const media = this.media();
        if (!media || this.isSubmitting() || !this.hasChanges() || !this.validate()) {
            return;
        }

        this.isSubmitting.set(true);

        // Колекцію резолвимо (знайти існуючу / створити нову) лише якщо її змінили
        const collectionChanged = this.dirty.changed('collection');
        const collectionId$ = collectionChanged ? this.resolveCollectionId() : of(null);
        // Автора теж резолвимо (знайти існуючого / створити нового) лише якщо його змінили
        const creatorChanged = this.dirty.changed('creator');
        const creatorId$ = creatorChanged ? this.resolveCreatorId() : of(null);

        forkJoin([collectionId$, creatorId$]).pipe(
            switchMap(([collectionId, creatorId]) => this.mediaService.updateMedia(this.buildUpdatePayload(media.id, collectionId, creatorId))),
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show(`Фільм "${updated?.title ?? this.title()}" оновлено ✅`, 'success', 4000);
                // Нова точка відліку: форма знову "чиста"
                this.dirty.markClean();
                if (updated?.collection) {
                    this.collectionId.set(updated.collection.id);
                    this.collectionName.set(updated.collection.name);
                }
                if (updated?.creator) {
                    this.creatorId.set(updated.creator.id);
                    this.creatorName.set(updated.creator.name);
                }
                this.mediaUpdated.emit(updated);
            },
            error: err => {
                console.error('Помилка оновлення медіа:', err);
                this.toastService.show(`Не вдалося оновити "${this.title()}".`, 'error', 6000);
            }
        });
    }

    /** Надсилаємо лише змінені поля; незмінені — null (бекенд null-поля не оновлює). */
    private buildUpdatePayload(mediaId: string, collectionId: CollectionId | null, creatorId: CreatorId | null): UpdateMediaRequest {
        return {
            mediaId,
            ...this.dirty.diff({
                title: 'title',
                type: 'type',
                description: 'description',
                originalTitle: 'originalTitle',
                releaseYear: 'releaseYear',
                duration: 'duration',
                posterUrl: 'posterUrl',
                visibility: 'visibility',
                creatorId: { when: 'creator', value: () => creatorId },
                genres: { when: 'genres', value: () => parseCommaList(this.genresInput()) },
                tags: { when: 'tags', value: () => parseCommaList(this.tagsInput()) },
                links: { when: 'links', value: () => [...this.links()] },
                cast: { when: 'cast', value: () => this.castPayload() },
                collectionId: { when: 'collection', value: () => collectionId }
            }),
            seasons: null
        };
    }

    private castPayload(): MediaActor[] {
        return this.cast().map(c => ({ ...c, characterName: (c.characterName ?? '').trim() }));
    }

    onSubmitStandalone(): void {
        this.submit();
    }

    private validate(): boolean {
        const title = this.title();
        const releaseYear = this.releaseYear();
        const duration = this.duration();
        const posterUrl = this.posterUrl();

        if (!title.trim()) {
            this.toastService.show('Будь ласка, введіть назву медіа.', 'error');
            return false;
        }
        const baseline = this.dirty.baseline;
        if (baseline) {
            if (baseline.creator.startsWith('id:') && this.snapshot().creator === '') {
                this.toastService.show('Автора не можна прибрати після збереження — оберіть іншого.', 'error');
                return false;
            }
            if (baseline.collection.startsWith('id:') && this.snapshot().collection === '') {
                this.toastService.show('Колекцію не можна прибрати після збереження — оберіть іншу.', 'error');
                return false;
            }
            if (releaseYear == null && baseline.releaseYear != null) {
                this.toastService.show('Рік випуску не можна очистити після збереження — вкажіть інше значення.', 'error');
                return false;
            }
            if (duration == null && baseline.duration != null) {
                this.toastService.show('Тривалість не можна очистити після збереження — вкажіть інше значення.', 'error');
                return false;
            }
        }
        if (releaseYear != null && (releaseYear < MIN_RELEASE_YEAR || releaseYear > MAX_RELEASE_YEAR)) {
            this.toastService.show(`Рік випуску має бути між ${MIN_RELEASE_YEAR} та ${MAX_RELEASE_YEAR}.`, 'error');
            return false;
        }
        if (duration != null && duration < 1) {
            this.toastService.show('Тривалість має бути більшою за 0 секунд.', 'error');
            return false;
        }
        if (posterUrl.trim() && !isHttpUrl(posterUrl.trim())) {
            this.toastService.show('Некоректне посилання на постер.', 'error');
            return false;
        }
        return true;
    }

    private buildPayload(collectionId: CollectionId | null, creatorId: CreatorId | null): CreateMediaRequest {
        return {
            title: this.title().trim(),
            originalTitle: this.originalTitle().trim(),
            description: this.description(),
            type: this.type(),
            releaseYear: this.releaseYear(),
            duration: this.duration(),
            posterUrl: this.posterUrl().trim(),
            visibility: this.visibility(),
            links: [...this.links()],
            creatorId,
            genres: parseCommaList(this.genresInput()),
            tags: parseCommaList(this.tagsInput()),
            cast: this.castPayload(),
            seasons: this.isSeries() ? this.seasons() : [],
            collectionId
        };
    }

    private resolveCreatorId(): Observable<CreatorId | null> {
        return this.resolveEntityId<CreatorResponse, CreatorId>({
            selectedId: this.creatorId(),
            name: this.creatorName(),
            search: this.searchCreators,
            create: name => this.creatorService.createCreator({ name, visibility: this.visibility() }),
            errorMessage: name => `Не вдалося створити автора "${name}".`
        });
    }

    private resolveCollectionId(): Observable<CollectionId | null> {
        return this.resolveEntityId<MediaCollectionResponse, CollectionId>({
            selectedId: this.collectionId(),
            name: this.collectionName(),
            search: this.searchCollections,
            create: name => this.collectionService.createCollection({ name, visibility: this.visibility(), tags: [] }),
            errorMessage: name => `Не вдалося створити колекцію "${name}".`
        });
    }

    /** Обрана сутність → її id; введена назва → знайти існуючу з такою назвою або створити нову; порожньо → null. */
    private resolveEntityId<T extends { id: string; name: string }, TId extends string>(options: {
        selectedId: string | null;
        name: string;
        search: (query: string) => Observable<T[]>;
        create: (name: string) => Observable<T>;
        errorMessage: (name: string) => string;
    }): Observable<TId | null> {
        if (options.selectedId) {
            return of(options.selectedId as TId);
        }

        const name = options.name.trim();
        if (!name) {
            return of(null);
        }

        return options.search(name).pipe(
            map(items => items.find(item => item.name.toLowerCase() === name.toLowerCase())),
            switchMap(existing => existing ? of(existing) : options.create(name)),
            map(entity => entity.id as TId),
            catchError(err => {
                console.error('Помилка пошуку/створення:', err);
                this.toastService.show(options.errorMessage(name), 'error', 6000);
                return EMPTY;
            })
        );
    }

    private onCreated(created: MediaItem): void {
        const title = this.title();
        this.toastService.show(`Медіа "${title}" успішно створено! 🎉`, 'success', 5000);

        if (this.embedded()) {
            this.mediaCreatedWithData.emit(created);
        } else {
            this.mediaCreated.emit();
        }
        this.resetForm();
    }

    private resetForm(): void {
        this.metadataSub?.unsubscribe();
        this.metadataSub = null;

        this.title.set('');
        this.originalTitle.set('');
        this.description.set('');
        this.type.set(MediaType.Movie);
        this.releaseYear.set(null);
        this.duration.set(null);
        this.posterUrl.set('');
        this.visibility.set(Visibility.Public);
        this.links.set([]);
        this.typeTouched = false;
        this.genresInput.set('');
        this.tagsInput.set('');
        this.imageError.set(false);
        this.newLinkUrl.set('');
        this.cast.set([]);
        this.seasons.set([]);
        this.creatorId.set(null);
        this.creatorName.set('');
        this.collectionId.set(null);
        this.collectionName.set('');
    }
}