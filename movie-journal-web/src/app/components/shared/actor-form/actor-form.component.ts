import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ActorService } from '../../../services/actor.service';
import { ToastService } from '../../../services/toast.service';
import { Visibility, VisibilityLabels } from '../../../models/enums';
import { CreateActorRequest } from '../../../models/actor.model';

const MIN_BIRTH_YEAR = 1800;

type FieldName = 'fullName' | 'photoUrl' | 'birthDate';
type FormErrors = Partial<Record<FieldName, string>>;

const createEmptyActor = (): CreateActorRequest => ({
    fullName: '',
    birthDate: null,
    biography: '',
    photoUrl: '',
    visibility: Visibility.Public
});

@Component({
    selector: 'app-actor-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './actor-form.component.html',
    styleUrls: ['./actor-form.component.scss']
})
export class ActorFormComponent {
    private readonly actorService = inject(ActorService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    /** Актора створено на сервері: батько може закрити модалку та оновити список. */
    readonly actorCreated = output<void>();

    /** Користувач натиснув «Скасувати». */
    readonly cancelled = output<void>();

    actorData: CreateActorRequest = createEmptyActor();

    birthYear: number | null = null;
    birthMonth: number | null = null;
    birthDay: number | null = null;

    readonly imageError = signal(false);
    readonly isSubmitting = signal(false);

    /** Помилки валідації показуються під відповідними полями (а не тостами). */
    readonly errors = signal<FormErrors>({});

    readonly maxBirthYear = new Date().getFullYear();
    readonly minBirthYear = MIN_BIRTH_YEAR;

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));

    /** Адреса для прев'ю: без пробілів по краях, порожній рядок — прев'ю немає. */
    get photoPreviewUrl(): string {
        return (this.actorData.photoUrl ?? '').trim();
    }

    onPhotoUrlChange(value: string): void {
        this.actorData.photoUrl = value;
        this.imageError.set(false);
        this.clearError('photoUrl');
    }

    clearError(field: FieldName): void {
        if (this.errors()[field]) {
            this.errors.update(current => ({ ...current, [field]: undefined }));
        }
    }

    onSubmit(): void {
        if (this.isSubmitting()) {
            return;
        }

        const validated = this.validate();
        if (!validated) {
            return;
        }

        const { payload, fullName } = validated;
        this.isSubmitting.set(true);

        this.actorService.createActor(payload).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show(`Актора "${fullName}" успішно створено! 🎉`, 'success', 5000);
                this.actorCreated.emit();
                this.resetForm();
            },
            error: err => {
                console.error('Помилка створення актора:', err);
                this.toastService.show(`Не вдалося створити актора "${fullName}".`, 'error', 6000);
            }
        });
    }

    onCancel(): void {
        if (!this.isSubmitting()) {
            this.cancelled.emit();
        }
    }

    /** Перевіряє форму, показує всі помилки одразу й повертає payload (не мутуючи стан форми). */
    private validate(): { payload: CreateActorRequest; fullName: string } | null {
        const errors: FormErrors = {};

        const fullName = this.actorData.fullName.trim();
        if (!fullName) {
            errors.fullName = "Введіть повне ім'я актора.";
        }

        const photoUrl = this.photoPreviewUrl;
        if (photoUrl && !this.isValidUrl(photoUrl)) {
            errors.photoUrl = 'Некоректне посилання: потрібен http:// або https://';
        }

        const birth = this.resolveBirthDate();
        if (birth.error) {
            errors.birthDate = birth.error;
        }

        this.errors.set(errors);
        if (Object.keys(errors).length > 0) {
            return null;
        }

        return {
            fullName,
            payload: {
                ...this.actorData,
                fullName,
                photoUrl,
                biography: (this.actorData.biography ?? '').trim(),
                birthDate: birth.value
            }
        };
    }

    /**
     * Збирає дату народження з трьох полів. Порожні поля -> null;
     * часткова, неіснуюча (31 лютого) чи майбутня дата -> помилка.
     */
    private resolveBirthDate(): { value: string | null; error?: string } {
        const { birthYear: y, birthMonth: m, birthDay: d } = this;

        if (!y && !m && !d) {
            return { value: null };
        }

        if (!y || !m || !d) {
            return { value: null, error: 'Заповніть повну дату народження або залиште її порожньою.' };
        }

        if (y < MIN_BIRTH_YEAR || y > this.maxBirthYear) {
            return { value: null, error: `Рік народження має бути між ${MIN_BIRTH_YEAR} та ${this.maxBirthYear}.` };
        }

        const date = new Date(Date.UTC(y, m - 1, d));
        const isRealDate =
            date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;

        if (!isRealDate) {
            return { value: null, error: 'Такої дати не існує. Перевірте день і місяць.' };
        }

        if (date.getTime() > Date.now()) {
            return { value: null, error: 'Дата народження не може бути в майбутньому.' };
        }

        return { value: date.toISOString() };
    }

    private isValidUrl(value: string): boolean {
        try {
            const { protocol } = new URL(value);
            return protocol === 'http:' || protocol === 'https:';
        } catch {
            return false;
        }
    }

    private resetForm(): void {
        this.actorData = createEmptyActor();
        this.birthYear = null;
        this.birthMonth = null;
        this.birthDay = null;
        this.imageError.set(false);
        this.errors.set({});
    }
}