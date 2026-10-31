import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Visibility } from '../../../models/enums';
import { SeriesService } from '../../../services/series.service';
import { ToastService } from '../../../services/toast.service';
import { CreateSeriesRequest, SeriesResponse, UpdateSeriesRequest } from '../../../models/series.model';
import { createDirtyTracker } from '../../../utils/form-diff';
import { parseCommaList } from '../../../utils/form-parse.util';
import { VisibilityToggleComponent } from '../visibility-toggle/visibility-toggle.component';

/** Редаговані поля; порівнюються з baseline для dirty-check і payload. */
interface Snapshot {
    title: string;
    description: string;
    posterUrl: string;
    visibility: Visibility;
    tags: string;
}

@Component({
    selector: 'app-series-form',
    standalone: true,
    imports: [FormsModule, VisibilityToggleComponent],
    templateUrl: './series-form.component.html',
    styleUrls: ['./series-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeriesFormComponent implements OnInit {
    private seriesService = inject(SeriesService);
    private toastService = inject(ToastService);
    private destroyRef = inject(DestroyRef);

    readonly seriesCreated = output<void>();

    /** Якщо передано серіал — форма працює в режимі редагування. */
    readonly series = input<SeriesResponse | null>(null);
    readonly isEditMode = computed(() => this.series() !== null);
    /** Повертає збережену на сервері версію після успішного оновлення. */
    readonly seriesUpdated = output<SeriesResponse>();
    readonly isSubmitting = signal(false);

    private readonly dirty = createDirtyTracker(() => this.snapshot());

    // ---- Поля форми (signals) ----
    readonly title = signal('');
    readonly description = signal('');
    readonly posterUrl = signal('');
    readonly visibility = signal<Visibility>(Visibility.Public);
    readonly tagsInput = signal('');
    readonly imageError = signal(false);

    ngOnInit(): void {
        const item = this.series();
        if (item) {
            this.title.set(item.title ?? '');
            this.description.set(item.description ?? '');
            this.posterUrl.set(item.posterUrl ?? '');
            this.visibility.set(item.visibility);
            this.tagsInput.set((item.tags ?? []).join(', '));
        }
        this.dirty.markClean();
    }

    private snapshot(): Snapshot {
        return {
            title: this.title().trim(),
            description: this.description().trim(),
            posterUrl: this.posterUrl().trim(),
            visibility: this.visibility(),
            tags: parseCommaList(this.tagsInput()).join('\u0000')
        };
    }

    /** Чи відрізняється форма від початкового стану (у створенні — чи щось введено). */
    hasChanges(): boolean {
        return this.dirty.hasChanges();
    }

    onPosterUrlChange() {
        this.imageError.set(false);
    }

    onSubmit() {
        if (!this.title().trim()) {
            this.toastService.show('Будь ласка, введіть назву серіалу.', 'error');
            return;
        }

        if (this.isEditMode()) {
            this.update();
            return;
        }

        if (this.isSubmitting()) {
            return;
        }

        const payload: CreateSeriesRequest = {
            title: this.title().trim(),
            description: this.description(),
            posterUrl: this.posterUrl(),
            visibility: this.visibility(),
            genres: [],
            tags: parseCommaList(this.tagsInput())
        };

        this.isSubmitting.set(true);
        this.seriesService.createSeries(payload).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show(`Серіал "${payload.title}" успішно створено! 🎉`, 'success', 5000);
                this.seriesCreated.emit();
            },
            error: () => { /* помилку вже показав httpErrorInterceptor */ }
        });
    }

    private update(): void {
        const item = this.series();
        if (!item || this.isSubmitting() || !this.hasChanges()) {
            return;
        }

        const fallbackTitle = this.title().trim();
        // Лише змінені поля; незмінені — null (бекенд null-поля не оновлює)
        const request: UpdateSeriesRequest = {
            seriesId: item.id,
            ...this.dirty.diff({
                title: 'title',
                description: 'description',
                posterUrl: 'posterUrl',
                visibility: 'visibility',
                tags: { when: 'tags', value: () => parseCommaList(this.tagsInput()) }
            })
        };

        this.isSubmitting.set(true);
        this.seriesService.updateSeries(request).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show(`Серіал "${updated?.title ?? fallbackTitle}" оновлено ✅`, 'success', 4000);
                this.dirty.markClean();
                this.seriesUpdated.emit(updated);
            },
            error: () => { /* помилку вже показав httpErrorInterceptor */ }
        });
    }
}