import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ActorService } from '../../../services/actor.service';
import { ToastService } from '../../../services/toast.service';
import { Visibility, VisibilityLabels, Sex, SexLabels } from '../../../models/enums';
import { ActorItem, CreateActorRequest, UpdateActorRequest } from '../../../models/actor.model';

const MIN_BIRTH_YEAR = 1800;

type FieldName = 'fullName' | 'photoUrl' | 'birthDate';
type FormErrors = Partial<Record<FieldName, string>>;

/** Нормалізований «знімок» полів форми: за ним визначаємо, що користувач змінив. */
interface Snapshot {
    fullName: string;
    photoUrl: string;
    biography: string;
    visibility: Visibility;
    sex: Sex | null | undefined;
    /** «рік-місяць-день» як ввів користувач (порожні частини — порожні рядки). */
    birth: string;
}

const emptySnapshot = (): Snapshot => ({
    fullName: '',
    photoUrl: '',
    biography: '',
    visibility: Visibility.Public,
    sex: null,
    birth: '--'
});

const createEmptyActor = (): CreateActorRequest => ({
    fullName: '',
    birthDate: null,
    biography: '',
    photoUrl: '',
    visibility: Visibility.Public,
    sex: null
});

@Component({
    selector: 'app-actor-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './actor-form.component.html',
    styleUrls: ['./actor-form.component.scss']
})
export class ActorFormComponent implements OnInit {
    private readonly actorService = inject(ActorService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    /** Актор для редагування. Не задано — форма створює нового. */
    readonly actor = input<ActorItem | null>(null);
    readonly isEditMode = computed(() => !!this.actor());

    /** Актора створено на сервері: батько може закрити модалку та оновити список. */
    readonly actorCreated = output<void>();

    /** Актора оновлено: приходить актуальна версія з сервера. */
    readonly actorUpdated = output<ActorItem>();

    /** Користувач натиснув «Скасувати». */
    readonly cancelled = output<void>();

    actorData: CreateActorRequest = createEmptyActor();

    birthYear: number | null = null;
    birthMonth: number | null = null;
    birthDay: number | null = null;

    readonly imageError = signal(false);
    readonly isSubmitting = signal(false);

    /** Помилки валідації показуються під відповідними полями. */
    readonly errors = signal<FormErrors>({});

    readonly maxBirthYear = new Date().getFullYear();
    readonly minBirthYear = MIN_BIRTH_YEAR;

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));

    readonly sexOptions = [
        { value: null, label: '— Не вказано —' },
        ...(Object.values(Sex).filter(v => typeof v === 'number') as Sex[]).map(value => ({
            value,
            label: SexLabels[value] ?? String(value)
        }))
    ];

    /** Початковий стан форми. */
    private baseline: Snapshot = emptySnapshot();

    ngOnInit(): void {
        const actor = this.actor();
        if (actor) {
            this.populateFrom(actor);
        }
    }

    get photoPreviewUrl(): string {
        return (this.actorData.photoUrl ?? '').trim();
    }

    hasChanges(): boolean {
        const current = this.snapshot();
        return (Object.keys(current) as (keyof Snapshot)[]).some(key => current[key] !== this.baseline[key]);
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

        const actor = this.actor();
        if (actor && !this.hasChanges()) {
            return;
        }

        const validated = this.validate();
        if (!validated) {
            return;
        }

        this.isSubmitting.set(true);

        if (actor) {
            this.update(actor, validated);
        } else {
            this.create(validated);
        }
    }

    onCancel(): void {
        if (!this.isSubmitting()) {
            this.cancelled.emit();
        }
    }

    private create(values: ValidatedValues): void {
        const payload: CreateActorRequest = {
            ...this.actorData,
            fullName: values.fullName,
            photoUrl: values.photoUrl,
            biography: values.biography,
            birthDate: values.birthDate,
            sex: this.actorData.sex ?? null
        };

        this.actorService.createActor(payload).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show(`Актора "${values.fullName}" успішно створено! 🎉`, 'success', 5000);
                this.actorCreated.emit();
                this.resetForm();
            },
            error: err => {
                console.error('Помилка створення актора:', err);
                this.toastService.show(`Не вдалося створити актора "${values.fullName}".`, 'error', 6000);
            }
        });
    }

    private update(actor: ActorItem, values: ValidatedValues): void {
        const base = this.baseline;

        const payload: UpdateActorRequest = {
            actorId: actor.id,
            fullName: values.fullName !== base.fullName ? values.fullName : null,
            photoUrl: values.photoUrl !== base.photoUrl ? values.photoUrl : null,
            biography: values.biography !== base.biography ? values.biography : null,
            visibility: this.actorData.visibility !== base.visibility ? this.actorData.visibility : null,
            sex: this.actorData.sex !== base.sex ? (this.actorData.sex ?? null) : null,
            birthDate: this.snapshot().birth !== base.birth ? values.birthDate : null
        };

        this.actorService.updateActor(payload).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show(`Зміни для "${updated.fullName}" збережено ✅`, 'success', 4000);
                this.actorUpdated.emit(updated);
            },
            error: err => {
                console.error('Помилка оновлення актора:', err);
                this.toastService.show(`Не вдалося зберегти зміни для "${actor.fullName}".`, 'error', 6000);
            }
        });
    }

    private validate(): ValidatedValues | null {
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
        } else if (this.actor() && birth.value === null && this.baseline.birth !== emptySnapshot().birth) {
            errors.birthDate = 'Збережену дату народження не можна видалити — введіть іншу дату.';
        }

        this.errors.set(errors);
        if (Object.keys(errors).length > 0) {
            return null;
        }

        return {
            fullName,
            photoUrl,
            biography: (this.actorData.biography ?? '').trim(),
            birthDate: birth.value
        };
    }

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

    private snapshot(): Snapshot {
        return {
            fullName: this.actorData.fullName.trim(),
            photoUrl: this.photoPreviewUrl,
            biography: (this.actorData.biography ?? '').trim(),
            visibility: this.actorData.visibility ?? Visibility.Public,
            sex: this.actorData.sex ?? null,
            birth: `${this.birthYear ?? ''}-${this.birthMonth ?? ''}-${this.birthDay ?? ''}`
        };
    }

    private populateFrom(actor: ActorItem): void {
        this.actorData = {
            fullName: actor.fullName ?? '',
            birthDate: actor.birthDate ?? null,
            biography: actor.biography ?? '',
            photoUrl: actor.photoUrl ?? '',
            visibility: actor.visibility ?? Visibility.Public,
            sex: actor.sex ?? null
        };

        const birth = actor.birthDate ? new Date(actor.birthDate) : null;
        if (birth && !Number.isNaN(birth.getTime())) {
            this.birthYear = birth.getUTCFullYear();
            this.birthMonth = birth.getUTCMonth() + 1;
            this.birthDay = birth.getUTCDate();
        }

        this.baseline = this.snapshot();
    }

    private resetForm(): void {
        this.actorData = createEmptyActor();
        this.birthYear = null;
        this.birthMonth = null;
        this.birthDay = null;
        this.imageError.set(false);
        this.errors.set({});
        this.baseline = emptySnapshot();
    }
}

interface ValidatedValues {
    fullName: string;
    photoUrl: string;
    biography: string;
    birthDate: string | null;
}