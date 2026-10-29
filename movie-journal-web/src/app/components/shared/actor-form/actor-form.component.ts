import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ActorService } from '../../../services/actor.service';
import { ToastService } from '../../../services/toast.service';
import { Visibility, VisibilityLabels, Sex, SexLabels } from '../../../models/enums';
import { ActorItem, CreateActorRequest, UpdateActorRequest } from '../../../models/actor.model';
import { CountryPickerComponent } from '../country-picker/country-picker.component';
import { skipErrorToast } from '../../../interceptors/http-error.interceptor';
import { createDirtyTracker } from '../../../utils/form-diff';
import { isHttpUrl } from '../../../utils/form-parse.util';

const MIN_BIRTH_YEAR = 1800;

type FieldName = 'fullName' | 'photoUrl' | 'birthDate';
type FormErrors = Partial<Record<FieldName, string>>;

/** Нормалізований «знімок» полів форми: за ним визначаємо, що користувач змінив. */
interface Snapshot {
    fullName: string;
    alias: string;
    photoUrl: string;
    biography: string;
    visibility: Visibility;
    sex: Sex | null | undefined;
    /** «рік-місяць-день» як ввів користувач (порожні частини — порожні рядки). */
    birth: string;
    /** Коди країн (ISO alpha-3) через кому — лише для порівняння. */
    nationalities: string;
}

const emptySnapshot = (): Snapshot => ({
    fullName: '',
    alias: '',
    photoUrl: '',
    biography: '',
    visibility: Visibility.Public,
    sex: null,
    birth: '--',
    nationalities: ''
});

@Component({
    selector: 'app-actor-form',
    standalone: true,
    imports: [FormsModule, CountryPickerComponent],
    templateUrl: './actor-form.component.html',
    styleUrls: ['./actor-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
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

    // ---- Поля форми (signals) ----
    readonly fullName = signal('');
    readonly alias = signal('');
    readonly biography = signal('');
    readonly photoUrl = signal('');
    readonly visibility = signal<Visibility>(Visibility.Public);
    readonly sex = signal<Sex | null>(null);
    readonly nationalities = signal<string[]>([]);
    readonly birthYear = signal<number | null>(null);
    readonly birthMonth = signal<number | null>(null);
    readonly birthDay = signal<number | null>(null);

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
        ...Object.values(Sex).map(value => ({
            value,
            label: SexLabels[value] ?? String(value)
        }))
    ];

    /** Початковий стан форми. */
    private readonly dirty = createDirtyTracker(() => this.snapshot(), emptySnapshot());

    ngOnInit(): void {
        const actor = this.actor();
        if (actor) {
            this.populateFrom(actor);
        }
    }

    readonly photoPreviewUrl = computed(() => this.photoUrl().trim());

    hasChanges(): boolean {
        return this.dirty.hasChanges();
    }

    onPhotoUrlChange(value: string): void {
        this.photoUrl.set(value);
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
            fullName: values.fullName,
            alias: this.snapshot().alias || null,
            photoUrl: values.photoUrl,
            biography: values.biography,
            birthDate: values.birthDate,
            visibility: this.visibility(),
            sex: this.sex(),
            nationalities: [...this.nationalities()]
        };

        this.actorService.createActor(payload, skipErrorToast()).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.toastService.show(`Актора "${values.fullName}" успішно створено! 🎉`, 'success', 5000);
                this.actorCreated.emit();
                this.resetForm();
            },
            error: () => {
                this.toastService.show(`Не вдалося створити актора "${values.fullName}".`, 'error', 6000);
            }
        });
    }

    private update(actor: ActorItem, values: ValidatedValues): void {
        const payload: UpdateActorRequest = {
            actorId: actor.id,
            // Порожній рядок очищає псевдонім; null — «не змінювати»
            ...this.dirty.diff({
                fullName: 'fullName',
                alias: 'alias',
                photoUrl: 'photoUrl',
                biography: 'biography',
                visibility: 'visibility',
                sex: { when: 'sex', value: () => this.sex() },
                birthDate: { when: 'birth', value: () => values.birthDate }
            }),
            // Поле не nullable на BE, тому завжди надсилаємо поточний список
            nationalities: [...this.nationalities()]
        };

        this.actorService.updateActor(payload, skipErrorToast()).pipe(
            finalize(() => this.isSubmitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: updated => {
                this.toastService.show(`Зміни для "${updated.fullName}" збережено ✅`, 'success', 4000);
                this.actorUpdated.emit(updated);
            },
            error: () => {
                this.toastService.show(`Не вдалося зберегти зміни для "${actor.fullName}".`, 'error', 6000);
            }
        });
    }

    private validate(): ValidatedValues | null {
        const errors: FormErrors = {};

        const fullName = this.fullName().trim();
        if (!fullName) {
            errors.fullName = "Введіть повне ім'я актора.";
        }

        const photoUrl = this.photoPreviewUrl();
        if (photoUrl && !isHttpUrl(photoUrl)) {
            errors.photoUrl = 'Некоректне посилання: потрібен http:// або https://';
        }

        const birth = this.resolveBirthDate();
        if (birth.error) {
            errors.birthDate = birth.error;
        } else if (this.actor() && birth.value === null && this.dirty.baseline?.birth !== emptySnapshot().birth) {
            errors.birthDate = 'Збережену дату народження не можна видалити — введіть іншу дату.';
        }

        this.errors.set(errors);
        if (Object.keys(errors).length > 0) {
            return null;
        }

        return {
            fullName,
            photoUrl,
            biography: this.biography().trim(),
            birthDate: birth.value
        };
    }

    private resolveBirthDate(): { value: string | null; error?: string } {
        const y = this.birthYear();
        const m = this.birthMonth();
        const d = this.birthDay();

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

    private snapshot(): Snapshot {
        return {
            fullName: this.fullName().trim(),
            alias: this.alias().trim(),
            photoUrl: this.photoPreviewUrl(),
            biography: this.biography().trim(),
            visibility: this.visibility(),
            sex: this.sex(),
            birth: `${this.birthYear() ?? ''}-${this.birthMonth() ?? ''}-${this.birthDay() ?? ''}`,
            nationalities: this.nationalities().join(',')
        };
    }

    private populateFrom(actor: ActorItem): void {
        this.fullName.set(actor.fullName ?? '');
        this.alias.set(actor.alias ?? '');
        this.biography.set(actor.biography ?? '');
        this.photoUrl.set(actor.photoUrl ?? '');
        this.visibility.set(actor.visibility ?? Visibility.Public);
        this.sex.set(actor.sex ?? null);
        this.nationalities.set([...(actor.nationalities ?? [])]);

        const birth = actor.birthDate ? new Date(actor.birthDate) : null;
        if (birth && !Number.isNaN(birth.getTime())) {
            this.birthYear.set(birth.getUTCFullYear());
            this.birthMonth.set(birth.getUTCMonth() + 1);
            this.birthDay.set(birth.getUTCDate());
        }

        this.dirty.markClean();
    }

    private resetForm(): void {
        this.fullName.set('');
        this.alias.set('');
        this.biography.set('');
        this.photoUrl.set('');
        this.visibility.set(Visibility.Public);
        this.sex.set(null);
        this.nationalities.set([]);
        this.birthYear.set(null);
        this.birthMonth.set(null);
        this.birthDay.set(null);
        this.imageError.set(false);
        this.errors.set({});
        this.dirty.markClean(); // порожня форма = emptySnapshot()
    }
}

interface ValidatedValues {
    fullName: string;
    photoUrl: string;
    biography: string;
    birthDate: string | null;
}