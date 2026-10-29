import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Visibility, VisibilityLabels } from '../../../models/enums';
import { CreateCreatorRequest, CreatorResponse, UpdateCreatorRequest } from '../../../models/creator.model';
import { CreatorService } from '../../../services/creator.service';
import { ToastService } from '../../../services/toast.service';
import { createDirtyTracker } from '../../../utils/form-diff';
import { isHttpUrl } from '../../../utils/form-parse.util';

/** Редаговані поля; порівнюються з baseline для dirty-check і payload. */
interface Snapshot {
    name: string;
    description: string;
    imageUrl: string;
    websiteUrl: string;
    visibility: Visibility;
}

@Component({
    selector: 'app-creator-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './creator-form.component.html',
    styleUrls: ['./creator-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreatorFormComponent implements OnInit {
    private readonly creatorService = inject(CreatorService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    /** Якщо передано творця — форма працює в режимі редагування. */
    readonly creator = input<CreatorResponse | null>(null);
    readonly isEditMode = computed(() => this.creator() !== null);

    readonly creatorCreated = output<void>();
    /** Повертає збережену на сервері версію після успішного оновлення. */
    readonly creatorUpdated = output<CreatorResponse>();

    readonly isSubmitting = signal(false);

    private readonly dirty = createDirtyTracker(() => this.snapshot());

    // ---- Поля форми (signals) ----
    readonly name = signal('');
    readonly description = signal('');
    readonly imageUrl = signal('');
    readonly websiteUrl = signal('');
    readonly visibility = signal<Visibility>(Visibility.Public);
    readonly imageError = signal(false);

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));

    ngOnInit(): void {
        const creator = this.creator();
        if (creator) {
            this.name.set(creator.name ?? '');
            this.description.set(creator.description ?? '');
            this.imageUrl.set(creator.imageUrl ?? '');
            this.websiteUrl.set(creator.websiteUrl ?? '');
            this.visibility.set(creator.visibility);
        }
        // Точка відліку: відкрита форма редагування або порожня форма створення
        this.dirty.markClean();
    }

    private snapshot(): Snapshot {
        return {
            name: this.name().trim(),
            description: this.description().trim(),
            imageUrl: this.imageUrl().trim(),
            websiteUrl: this.websiteUrl().trim(),
            visibility: this.visibility()
        };
    }

    /** Чи відрізняється форма від початкового стану (у створенні — чи щось введено). */
    hasChanges(): boolean {
        return this.dirty.hasChanges();
    }

    onImageUrlChange(): void {
        this.imageError.set(false);
    }

    onSubmit(): void {
        if (this.isSubmitting() || !this.validate()) {
            return;
        }

        if (this.isEditMode()) {
            this.update();
        } else {
            this.create();
        }
    }

    private validate(): boolean {
        const cur = this.snapshot();

        if (!cur.name) {
            this.toastService.show('Будь ласка, введіть назву творця.', 'error');
            return false;
        }
        if (cur.imageUrl && !isHttpUrl(cur.imageUrl)) {
            this.toastService.show('Некоректне посилання на зображення.', 'error');
            return false;
        }
        if (cur.websiteUrl && !isHttpUrl(cur.websiteUrl)) {
            this.toastService.show('Некоректне посилання на сайт.', 'error');
            return false;
        }
        return true;
    }

    private create(): void {
        const cur = this.snapshot();
        const payload: CreateCreatorRequest = {
            name: cur.name,
            description: cur.description,
            imageUrl: cur.imageUrl,
            websiteUrl: cur.websiteUrl,
            visibility: cur.visibility
        };

        this.isSubmitting.set(true);
        this.creatorService.createCreator(payload).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show(`Творця "${payload.name}" успішно створено! 🎉`, 'success', 5000);
                this.creatorCreated.emit();
            },
            error: () => { /* помилку вже показав httpErrorInterceptor */ }
        });
    }

    private update(): void {
        const creator = this.creator();
        if (!creator || !this.hasChanges()) {
            return;
        }

        // Лише змінені поля; незмінені — null (бекенд null-поля не оновлює)
        const request: UpdateCreatorRequest = {
            creatorId: creator.id,
            ...this.dirty.diff({
                name: 'name',
                description: 'description',
                imageUrl: 'imageUrl',
                websiteUrl: 'websiteUrl',
                visibility: 'visibility'
            })
        };

        this.isSubmitting.set(true);
        this.creatorService.updateCreator(request).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show(`Творця "${updated?.name ?? this.name()}" оновлено ✅`, 'success', 4000);
                this.dirty.markClean();
                this.creatorUpdated.emit(updated);
            },
            error: () => { /* помилку вже показав httpErrorInterceptor */ }
        });
    }
}