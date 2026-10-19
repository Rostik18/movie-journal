import { Component, inject, output, signal, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaFormComponent } from '../media-form/media-form.component';
import { WatchStatus, WatchStatusLabels } from '../../../models/enums';
import { UserWatchingService } from '../../../services/user-watching.service';
import { MediaService } from '../../../services/media.service';
import { ToastService } from '../../../services/toast.service';
import { CreateUserWatchingRequest } from '../../../models/create-user-watching.model';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

@Component({
    selector: 'app-user-watching-form',
    standalone: true,
    imports: [CommonModule, FormsModule, MediaFormComponent, RatingStarsComponent],
    templateUrl: './user-watching-form.component.html',
    styleUrls: ['./user-watching-form.component.scss']
})
export class UserWatchingFormComponent {
    private userWatchingService = inject(UserWatchingService);
    private mediaService = inject(MediaService);
    private toastService = inject(ToastService);

    watchingCreated = output<void>();

    @ViewChild(MediaFormComponent) mediaFormComp?: MediaFormComponent;

    formData: CreateUserWatchingRequest = {
        mediaId: '',
        status: WatchStatus.Watching,
        rating: null,
        notes: '',
        stoppedAtSeconds: null,
        currentSeasonNumber: null,
        currentEpisodeNumber: null
    };

    isCreatingNewMedia = false;
    mediaSearchQuery = '';
    mediaSearchResults = signal<any[]>([]);
    selectedMediaTitle = '';

    statusOptions = Object.values(WatchStatus)
        .filter(v => typeof v === 'number')
        .map(v => ({ value: v as WatchStatus, label: WatchStatusLabels[v as WatchStatus] }));

    // Перевірка, чи введений рядок є URL
    private isUrl(text: string): boolean {
        return text.startsWith('http://') || text.startsWith('https://');
    }

    onSearchMedia() {
        const query = this.mediaSearchQuery.trim();
        if (!query) {
            this.formData.mediaId = '';
            this.mediaSearchResults.set([]);
            this.isCreatingNewMedia = false;
            return;
        }

        // Якщо користувач вставив URL замість назви фільму
        if (this.isUrl(query)) {
            this.mediaSearchResults.set([]);
            this.isCreatingNewMedia = true;
            this.formData.mediaId = '';

            // Використовуємо setTimeout, щоб дочекатися поки <app-media-form> з'явиться в DOM
            setTimeout(() => {
                if (this.mediaFormComp) {
                    this.mediaFormComp.initFromUrl(query);
                }
            }, 50);

            return;
        }

        // Звичайний текстовий пошук фільму в базі
        this.mediaService.searchMedia({ title: query, size: 5 }).subscribe({
            next: (res) => {
                const items = res.items || [];
                this.mediaSearchResults.set(items);

                const exactMatch = items.find(m => m.title.toLowerCase() === query.toLowerCase());
                if (exactMatch) {
                    this.formData.mediaId = exactMatch.id;
                    this.selectedMediaTitle = exactMatch.title;
                    this.isCreatingNewMedia = false;
                } else {
                    this.formData.mediaId = '';
                }
            },
            error: (err) => console.error('Помилка пошуку медіа:', err)
        });
    }

    selectMedia(media: any) {
        this.formData.mediaId = media.id;
        this.mediaSearchQuery = media.title;
        this.selectedMediaTitle = media.title;
        this.mediaSearchResults.set([]);
        this.isCreatingNewMedia = false;
    }

    clearMedia() {
        this.formData.mediaId = '';
        this.mediaSearchQuery = '';
        this.selectedMediaTitle = '';
        this.mediaSearchResults.set([]);
        this.isCreatingNewMedia = false;
    }

    toggleCreateNew() {
        this.isCreatingNewMedia = !this.isCreatingNewMedia;
        if (this.isCreatingNewMedia) {
            this.formData.mediaId = '';
        }
    }

    onSubmit() {
        if (this.isCreatingNewMedia) {
            if (!this.mediaFormComp) {
                return;
            }

            const mediaData = this.mediaFormComp.mediaData;

            if (!mediaData.title.trim()) {
                this.toastService.show("Будь ласка, введіть або зачекайте на завантаження назви нового фільму.", 'error');
                return;
            }

            mediaData.genres = this.mediaFormComp.genresInput
                ? this.mediaFormComp.genresInput.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            mediaData.tags = this.mediaFormComp.tagsInput
                ? this.mediaFormComp.tagsInput.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            this.toastService.show(`Створення фільму "${mediaData.title}" та додавання у список...`, 'info', 4000);

            this.mediaService.createMedia(mediaData).subscribe({
                next: (createdMedia: any) => {
                    this.formData.mediaId = createdMedia.id;
                    this.sendUserWatchingRequest();
                },
                error: (err) => {
                    console.error('Помилка створення фільму:', err);
                    this.toastService.show('Не вдалося створити новий фільм.', 'error', 6000);
                }
            });
        } else {
            if (!this.formData.mediaId) {
                this.toastService.show('Будь ласка, оберіть фільм або введіть URL / створіть новий.', 'error');
                return;
            }
            this.sendUserWatchingRequest();
        }
    }

    private sendUserWatchingRequest() {
        this.userWatchingService.addToWatchlist(this.formData).subscribe({
            next: () => {
                this.toastService.show('Успішно додано до списку перегляду! 🎉', 'success', 4000);
                this.watchingCreated.emit();
            },
            error: (err) => {
                console.error('Помилка:', err);
                this.toastService.show('Не вдалося додати до списку перегляду.', 'error', 6000);
            }
        });
    }
}