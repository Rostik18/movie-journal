import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { Visibility, WatchStatus, MediaType, MediaLinkType, VisibilityLabels, WatchStatusLabels, MediaTypeLabels, MediaLinkTypeLabels } from '../../models/enums';
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
    selectedLinkType = signal<MediaLinkType>(MediaLinkType.Other);
    tagsInput = signal(''); // теги через кому або пробіл

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
    readonly linkTypeOptions = [MediaLinkType.Streaming, MediaLinkType.Trailer, MediaLinkType.OfficialWebsite, MediaLinkType.Purchase, MediaLinkType.Other].map(value => ({
        value,
        label: MediaLinkTypeLabels[value]
    }));

    submitted = output<void>();
    cancelled = output<void>();

    onSubmit() {
        const text = this.payloadText().trim();
        if (!text) {
            this.toastService.show('Будь ласка, введіть дані для Payload', 'error');
            return;
        }

        // Парсимо теги з рядка через кому
        const tags = this.tagsInput()
            ? this.tagsInput().split(',').map(t => t.trim()).filter(Boolean)
            : [];

        const request: SeedRequest = {
            userId: null,
            visibility: this.selectedVisibility(),
            status: this.selectedStatus(),
            type: this.selectedType(),
            mediaLinkType: this.selectedLinkType(),
            tags: tags,
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
}