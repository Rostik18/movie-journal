import { Component, DestroyRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MediaFormComponent } from '../media-form/media-form.component';
import { MediaItem } from '../../../models/media.model';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { MediaType, WatchStatus, WatchStatusLabels } from '../../../models/enums';
import { UserWatchingService } from '../../../services/user-watching.service';
import { ToastService } from '../../../services/toast.service';
import { CreateUserWatchingRequest, UpdateUserWatchingRequest, UserWatchingItem, UserWatchingSidebar } from '../../../models/user-watching.model';
import { createDirtyTracker } from '../../../utils/form-diff';
import { CreateMediaRequestEvent, MediaPickerComponent, PickedMedia } from '../media-picker/media-picker.component';

/** Редаговані поля; порівнюються з baseline для dirty-check і payload. */
interface WatchingSnapshot {
    status: WatchStatus;
    rating: number | null;
    notes: string;
    stoppedAtSeconds: number | null;
    currentSeasonNumber: number | null;
    currentEpisodeNumber: number | null;
}

const emptySnapshot = (): WatchingSnapshot => ({
    status: WatchStatus.Watching,
    rating: null,
    notes: '',
    stoppedAtSeconds: null,
    currentSeasonNumber: null,
    currentEpisodeNumber: null
});

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
    imports: [FormsModule, MediaFormComponent, MediaPickerComponent, RatingStarsComponent],
    templateUrl: './user-watching-form.component.html',
    styleUrls: ['./user-watching-form.component.scss']
})
export class UserWatchingFormComponent implements OnInit {
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly watchingCreated = output<void>();

    /** Якщо передано запис — форма працює в режимі редагування (медіа не змінюється). */
    readonly watching = input<UserWatchingSidebar | null>(null);
    readonly isEditMode = computed(() => this.watching() !== null);
    /** Повертає збережену на сервері версію після успішного оновлення. */
    readonly watchingUpdated = output<UserWatchingItem>();

    private readonly dirty = createDirtyTracker(() => this.snapshot(), emptySnapshot());

    private readonly mediaForm = viewChild(MediaFormComponent);

    formData: CreateUserWatchingRequest = createEmptyWatching();

    // Робимо WatchStatus доступним у шаблоні
    readonly WatchStatus = WatchStatus;

    readonly statusOptions = Object.values(WatchStatus).map(type => ({
        value: type,
        label: WatchStatusLabels[type]
    }));

    // ---- Вибір існуючого медіа (MediaPicker) ----
    /** Текст пошуку живе тут, щоб пережити перемикання на форму створення нового медіа. */
    readonly mediaSearchQuery = signal('');
    readonly selectedMedia = signal<PickedMedia | null>(null);

    // ---- Створення нового медіа (вбудована форма) ----
    readonly isCreatingNewMedia = signal(false);
    readonly newMediaUrl = signal<string | null>(null);
    readonly newMediaTitle = signal('');

    // ---- Стан збереження ----
    private readonly isSavingWatching = signal(false);
    readonly isBusy = computed(
        () => this.isSavingWatching() || (this.mediaForm()?.isSubmitting() ?? false)
    );

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
            : this.selectedMedia()?.type === MediaType.Series;
    }

    ngOnInit(): void {
        const item = this.watching();
        if (!item) {
            return;
        }

        this.formData = {
            mediaId: item.media.id,
            status: item.status,
            rating: item.rating ?? null,
            notes: item.notes ?? '',
            stoppedAtSeconds: item.stoppedAtSeconds ?? null,
            currentSeasonNumber: item.currentSeasonNumber ?? null,
            currentEpisodeNumber: item.currentEpisodeNumber ?? null
        };
        this.selectedMedia.set({ id: item.media.id, title: item.media.title, type: item.media.type });
        this.dirty.markClean();
    }

    private snapshot(): WatchingSnapshot {
        const d = this.formData;
        return {
            status: d.status,
            rating: d.rating ?? null,
            notes: (d.notes ?? '').trim(),
            stoppedAtSeconds: d.stoppedAtSeconds ?? null,
            currentSeasonNumber: d.currentSeasonNumber ?? null,
            currentEpisodeNumber: d.currentEpisodeNumber ?? null
        };
    }

    /** Чи відрізняється форма від початкового стану (у створенні — чи щось введено). */
    hasChanges(): boolean {
        if (!this.isEditMode() && (this.selectedMedia() || this.mediaSearchQuery().trim() || this.isCreatingNewMedia())) {
            return true;
        }

        return this.dirty.hasChanges();
    }

    // ====================== Вибір і створення медіа ======================
    clearMedia(): void {
        this.selectedMedia.set(null);
        this.mediaSearchQuery.set('');
    }

    startCreateNew(request: CreateMediaRequestEvent): void {
        this.newMediaUrl.set(request.url);
        this.newMediaTitle.set(request.url ? '' : request.title);
        this.selectedMedia.set(null);
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

    onNewMediaCreated(created: MediaItem): void {
        // Захист від некоректної відповіді сервера: без id запис у список не додати
        if (!created?.id) {
            this.toastService.show('Медіа створено, але сервер не повернув його ідентифікатор.', 'error', 6000);
            return;
        }

        const title: string = created.title ?? this.mediaForm()?.mediaData.title ?? '';
        this.selectedMedia.set({
            id: created.id,
            title,
            type: created.type ?? this.mediaForm()?.mediaData.type ?? null
        });
        this.mediaSearchQuery.set(title);
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

        if (this.isEditMode()) {
            this.update();
            return;
        }

        if (this.isCreatingNewMedia()) {
            this.mediaForm()?.submit();
            return;
        }

        if (!this.selectedMedia()) {
            this.toastService.show('Будь ласка, оберіть фільм або введіть URL / створіть новий.', 'error');
            return;
        }
        this.saveToWatchlist();
    }

    private saveToWatchlist(): void {
        const media = this.selectedMedia();
        if (!media) {
            return;
        }

        this.isSavingWatching.set(true);

        // Очищаємо stoppedAtSeconds якщо статус не Watching
        if (this.formData.status !== WatchStatus.Watching) {
            this.formData.stoppedAtSeconds = null;
        }

        const payload: CreateUserWatchingRequest = {
            ...this.formData,
            mediaId: media.id,
            ...(this.showProgressFields ? {} : { currentSeasonNumber: null, currentEpisodeNumber: null })
        };

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

    private update(): void {
        const item = this.watching();
        if (!item || !this.hasChanges()) {
            return;
        }

        const request = this.buildUpdatePayload(item.media.id);
        if (!request) {
            return;
        }

        this.isSavingWatching.set(true);

        this.userWatchingService.updateWatchlist(request).pipe(
            finalize(() => this.isSavingWatching.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show('Запис у списку оновлено ✅', 'success', 4000);
                this.dirty.markClean();
                this.watchingUpdated.emit(updated);
            },
            error: err => {
                console.error('Помилка оновлення запису списку перегляду:', err);
                this.toastService.show('Не вдалося оновити запис списку перегляду.', 'error', 6000);
            }
        });
    }

    /**
     * Надсилаємо лише змінені поля; незмінені — null (бекенд null-поля не оновлює),
     * тому збережені числові значення очистити неможливо — повертаємо помилку валідації.
     */
    private buildUpdatePayload(mediaId: string): UpdateUserWatchingRequest | null {
        const cur = this.snapshot();
        const base = this.dirty.baseline ?? emptySnapshot();
        const isWatching = cur.status === WatchStatus.Watching;
        const showProgress = this.showProgressFields;

        if (isWatching && cur.stoppedAtSeconds == null && base.stoppedAtSeconds != null) {
            this.toastService.show('Час зупинки не можна очистити після збереження — вкажіть інше значення.', 'error');
            return null;
        }
        if (showProgress && (
            (cur.currentSeasonNumber == null && base.currentSeasonNumber != null) ||
            (cur.currentEpisodeNumber == null && base.currentEpisodeNumber != null))) {
            this.toastService.show('Сезон / епізод не можна очистити після збереження — вкажіть інше значення.', 'error');
            return null;
        }

        // Час зупинки та прогрес актуальні лише для статусу «Дивлюсь» / серіалу — інакше не надсилаємо
        const stoppedAt = isWatching ? cur.stoppedAtSeconds : base.stoppedAtSeconds;
        const season = showProgress ? cur.currentSeasonNumber : base.currentSeasonNumber;
        const episode = showProgress ? cur.currentEpisodeNumber : base.currentEpisodeNumber;

        return {
            mediaId,
            ...this.dirty.diff({
                status: 'status',
                rating: 'rating',
                notes: 'notes',
                stoppedAtSeconds: 'stoppedAtSeconds',
                currentSeasonNumber: 'currentSeasonNumber',
                currentEpisodeNumber: 'currentEpisodeNumber'
            }, { ...cur, stoppedAtSeconds: stoppedAt, currentSeasonNumber: season, currentEpisodeNumber: episode })
        };
    }

    private resetForm(): void {
        this.formData = createEmptyWatching();
        this.clearMedia();
    }
}