import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ActorService } from '../../../services/actor.service';
import { ToastService } from '../../../services/toast.service';
import { Visibility, VisibilityLabels } from '../../../models/enums';
import { CreateActorRequest } from '../../../models/actor.model';

const MIN_BIRTH_YEAR = 1800;
const MAX_BIRTH_YEAR = 2100;

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

    imageError = false;
    readonly isSubmitting = signal(false);

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));

    onPhotoUrlChange(value: string): void {
        this.actorData.photoUrl = value;
        this.imageError = false;
    }

    onSubmit(): void {
        if (this.isSubmitting()) {
            return;
        }

        const fullName = this.actorData.fullName.trim();
        if (!fullName) {
            this.toastService.show("Будь ласка, введіть повне ім'я актора.", 'error');
            return;
        }

        const photoUrl = (this.actorData.photoUrl ?? '').trim();
        if (photoUrl && !this.isValidUrl(photoUrl)) {
            this.toastService.show('Некоректне посилання на фото.', 'error');
            return;
        }

        const birth = this.resolveBirthDate();
        if (!birth.valid) {
            return;
        }

        // Формуємо окремий payload, не мутуючи стан форми
        const payload: CreateActorRequest = {
            ...this.actorData,
            fullName,
            photoUrl,
            biography: (this.actorData.biography ?? '').trim(),
            birthDate: birth.value
        };

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
        this.cancelled.emit();
    }

    /**
     * Збирає дату народження з трьох полів. Порожні поля -> null;
     * часткова, неіснуюча (31 лютого) чи майбутня дата -> помилка.
     */
    private resolveBirthDate(): { valid: boolean; value: string | null } {
        const { birthYear: y, birthMonth: m, birthDay: d } = this;

        if (!y && !m && !d) {
            return { valid: true, value: null };
        }

        if (!y || !m || !d) {
            return this.invalidDate('Заповніть повну дату народження або залиште її порожньою.');
        }

        if (y < MIN_BIRTH_YEAR || y > MAX_BIRTH_YEAR) {
            return this.invalidDate(`Рік народження має бути між ${MIN_BIRTH_YEAR} та ${MAX_BIRTH_YEAR}.`);
        }

        const date = new Date(Date.UTC(y, m - 1, d));
        const isRealDate =
            date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;

        if (!isRealDate) {
            return this.invalidDate('Такої дати не існує. Перевірте день і місяць.');
        }

        if (date.getTime() > Date.now()) {
            return this.invalidDate('Дата народження не може бути в майбутньому.');
        }

        return { valid: true, value: date.toISOString() };
    }

    private invalidDate(message: string): { valid: false; value: null } {
        this.toastService.show(message, 'error');
        return { valid: false, value: null };
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
        this.imageError = false;
    }
}