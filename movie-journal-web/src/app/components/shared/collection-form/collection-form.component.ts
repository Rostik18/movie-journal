import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Visibility, VisibilityLabels } from '../../../models/enums';
import { CollectionService } from '../../../services/collection.service';
import { ToastService } from '../../../services/toast.service';
import { CreateMediaCollectionRequest, MediaCollectionResponse, UpdateMediaCollectionRequest } from '../../../models/collection.model';
import { createDirtyTracker } from '../../../utils/form-diff';
import { parseCommaList } from '../../../utils/form-parse.util';

/** Редаговані поля; порівнюються з baseline для dirty-check і payload. */
interface Snapshot {
    name: string;
    description: string;
    posterUrl: string;
    visibility: Visibility;
    tags: string;
}

@Component({
    selector: 'app-collection-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './collection-form.component.html',
    styleUrls: ['./collection-form.component.scss']
})
export class CollectionFormComponent implements OnInit {
    private collectionService = inject(CollectionService);
    private toastService = inject(ToastService);
    private destroyRef = inject(DestroyRef);

    collectionCreated = output<void>();

    /** Якщо передано колекцію — форма працює в режимі редагування. */
    readonly collection = input<MediaCollectionResponse | null>(null);
    readonly isEditMode = computed(() => this.collection() !== null);
    /** Повертає збережену на сервері версію після успішного оновлення. */
    readonly collectionUpdated = output<MediaCollectionResponse>();
    readonly isSubmitting = signal(false);

    private readonly dirty = createDirtyTracker(() => this.snapshot());

    collectionData: CreateMediaCollectionRequest = {
        name: '',
        description: '',
        posterUrl: '',
        tags: [],
        visibility: Visibility.Public
    };

    tagsInput = '';
    imageError = false;

    visibilityOptions = [
        { value: Visibility.Public, label: VisibilityLabels[Visibility.Public] },
        { value: Visibility.Private, label: VisibilityLabels[Visibility.Private] }
    ];

    ngOnInit(): void {
        const col = this.collection();
        if (col) {
            this.collectionData = {
                name: col.name ?? '',
                description: col.description ?? '',
                posterUrl: col.posterUrl ?? '',
                tags: [...(col.tags ?? [])],
                visibility: col.visibility
            };
            this.tagsInput = (col.tags ?? []).join(', ');
        }
        this.dirty.markClean();
    }

    private snapshot(): Snapshot {
        const d = this.collectionData;
        return {
            name: d.name.trim(),
            description: (d.description ?? '').trim(),
            posterUrl: (d.posterUrl ?? '').trim(),
            visibility: d.visibility,
            tags: parseCommaList(this.tagsInput).join('\u0000')
        };
    }

    /** Чи відрізняється форма від початкового стану (у створенні — чи щось введено). */
    hasChanges(): boolean {
        return this.dirty.hasChanges();
    }

    onPosterUrlChange() {
        this.imageError = false;
    }

    onSubmit() {
        if (!this.collectionData.name.trim()) {
            this.toastService.show("Будь ласка, введіть назву колекції.", 'error');
            return;
        }

        if (this.isEditMode()) {
            this.update();
            return;
        }

        this.collectionData.tags = parseCommaList(this.tagsInput);

        this.toastService.show(`Створення колекції "${this.collectionData.name}" запущено у фоні...`, 'info', 4000);

        this.collectionService.createCollection(this.collectionData).subscribe({
            next: () => {
                this.toastService.show(`Колекцію "${this.collectionData.name}" успішно створено! 🎉`, 'success', 5000);
                this.collectionCreated.emit();
            },
            error: (err) => {
                console.error('Помилка створення колекції:', err);
                this.toastService.show(`Не вдалося створити колекцію.`, 'error', 6000);
            }
        });
    }

    private update(): void {
        const col = this.collection();
        if (!col || this.isSubmitting() || !this.hasChanges()) {
            return;
        }

        const cur = this.snapshot();
        // Лише змінені поля; незмінені — null (бекенд null-поля не оновлює)
        const request: UpdateMediaCollectionRequest = {
            collectionId: col.id,
            ...this.dirty.diff({
                name: 'name',
                description: 'description',
                posterUrl: 'posterUrl',
                visibility: 'visibility',
                tags: { when: 'tags', value: () => parseCommaList(this.tagsInput) }
            })
        };

        this.isSubmitting.set(true);
        this.collectionService.updateCollection(request).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show(`Колекцію "${updated?.name ?? cur.name}" оновлено ✅`, 'success', 4000);
                this.dirty.markClean();
                this.collectionUpdated.emit(updated);
            },
            error: err => {
                console.error('Помилка оновлення колекції:', err);
                this.toastService.show('Не вдалося оновити колекцію.', 'error', 6000);
            }
        });
    }
}