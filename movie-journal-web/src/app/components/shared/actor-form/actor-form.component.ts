import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActorService } from '../../../services/actor.service';
import { Visibility, VisibilityLabels } from '../../../models/enums';
import { CreateActorRequest } from '../../../models/actor.model';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-actor-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './actor-form.component.html',
    styleUrls: ['./actor-form.component.scss']
})
export class ActorFormComponent {
    private actorService = inject(ActorService);
    private toastService = inject(ToastService);

    // Подія для модального вікна (повідомляє батька про успішне створення)
    actorCreated = output<void>();

    // Подія для скасування (щоб батько міг закрити модалку)
    cancelled = output<void>();

    actorData: CreateActorRequest = {
        fullName: '',
        birthDate: null,
        biography: '',
        photoUrl: '',
        visibility: Visibility.Public
    };

    birthYear: number | null = null;
    birthMonth: number | null = null;
    birthDay: number | null = null;

    visibilityOptions = [
        { value: Visibility.Public, label: VisibilityLabels[Visibility.Public] },
        { value: Visibility.Private, label: VisibilityLabels[Visibility.Private] }
    ];

    onSubmit() {
        if (!this.actorData.fullName.trim()) {
            this.toastService.show("Будь ласка, введіть повне ім'я актора.", 'error');
            return;
        }

        if (this.birthYear || this.birthMonth || this.birthDay) {
            if (!this.birthYear || !this.birthMonth || !this.birthDay) {
                this.toastService.show("Заповніть повну дату народження або залиште її порожньою.", 'error');
                return;
            }
            const m = String(this.birthMonth).padStart(2, '0');
            const d = String(this.birthDay).padStart(2, '0');
            this.actorData.birthDate = `${this.birthYear}-${m}-${d}T00:00:00Z`;
        } else {
            this.actorData.birthDate = null;
        }

        // 1. Сповіщаємо, що процес пішов у фон і закриваємо модалку (або дозволяємо фону працювати)
        this.toastService.show(`Створення актора "${this.actorData.fullName}" запущено у фоні...`, 'info', 4000);

        // Повідомляємо батьківський компонент закрити модалку та оновити список
        this.actorCreated.emit();

        // 2. Відправляємо запит на бекенд у фоні
        this.actorService.createActor(this.actorData).subscribe({
            next: () => {
                this.toastService.show(`Актора "${this.actorData.fullName}" успішно створено! 🎉`, 'success', 5000);
            },
            error: (err) => {
                console.error('Помилка при фоновому створенні:', err);
                this.toastService.show(`Не вдалося створити актора "${this.actorData.fullName}".`, 'error', 6000);
            }
        });
    }

    onCancel() {
        this.cancelled.emit();
    }
}