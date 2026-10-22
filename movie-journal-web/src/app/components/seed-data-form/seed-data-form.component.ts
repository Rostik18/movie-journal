import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { Visibility, WatchStatus, MediaType, VisibilityLabels, WatchStatusLabels, MediaTypeLabels } from '../../models/enums';
import { ServerService, SeedRequest } from '../../services/server.service';

@Component({
    selector: 'app-seed-data-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './seed-data-form.component.html',
    styleUrls: ['./seed-data-form.component.scss']
})
export class SeedDataFormComponent {
    private serverService = inject(ServerService);
    private toastService = inject(ToastService);

    // Моделі для форми
    payloadText = signal('');
    selectedVisibility = signal<Visibility>(Visibility.Private);
    selectedStatus = signal<WatchStatus>(WatchStatus.Watched);
    selectedType = signal<MediaType>(MediaType.Video);
    tagsInput = signal('');
    authorInput = signal(''); // Новий сигнал для автора

    loading = signal(false);

    readonly visibilityOptions = [Visibility.Public, Visibility.Private].map(value => ({
        value,
        label: VisibilityLabels[value]
    }));
    readonly statusOptions = [WatchStatus.Wishlist, WatchStatus.Watching, WatchStatus.Watched, WatchStatus.Dropped].map(value => ({
        value,
        label: WatchStatusLabels[value]
    }));
    readonly typeOptions = [MediaType.Movie, MediaType.Series, MediaType.Animation, MediaType.Anime, MediaType.Documentary, MediaType.ShortFilm, MediaType.Video].map(value => ({
        value,
        label: MediaTypeLabels[value]
    }));

    submitted = output<void>();
    cancelled = output<void>();

    onSubmit() {
        const text = this.payloadText().trim();
        if (!text) {
            this.toastService.show('Будь ласка, введіть дані для Payload', 'error');
            return;
        }

        const tags = this.tagsInput()
            ? this.tagsInput().split(',').map(t => t.trim()).filter(Boolean)
            : [];

        const authorVal = this.authorInput().trim();

        const request: SeedRequest = {
            userId: null,
            visibility: this.selectedVisibility(),
            status: this.selectedStatus(),
            type: this.selectedType(),
            tags: tags,
            author: authorVal ? authorVal : null, // Передаємо автора або null
            payload: text
        };

        this.loading.set(true);
        this.serverService.seedData(request).subscribe({
            next: (response) => {
                this.loading.set(false);
                this.toastService.show(`Успішно! Відповідь сервера: ${response}`, 'success', 4000);
                this.submitted.emit();
            },
            error: (err) => {
                this.loading.set(false);
                console.error('Помилка seed запиту:', err);
                this.toastService.show('Помилка при виконанні seed запиту', 'error', 4000);
            }
        });
    }

    // Метод для очищення всієї бази даних
    onClearDatabase() {
        const confirmed = window.confirm('УВАГА! Ви дійсно хочете повністю очистити базу даних? Цю дію неможливо скасувати!');
        if (!confirmed) {
            return;
        }

        this.loading.set(true);
        this.serverService.clearDatabase().subscribe({
            next: (response) => {
                this.loading.set(false);
                this.toastService.show(response.message || 'Базу даних успішно очищено!', 'success', 4000);
                this.submitted.emit();
            },
            error: (err) => {
                this.loading.set(false);
                console.error('Помилка очищення бази даних:', err);
                this.toastService.show('Не вдалося очистити базу даних.', 'error', 4000);
            }
        });
    }
}