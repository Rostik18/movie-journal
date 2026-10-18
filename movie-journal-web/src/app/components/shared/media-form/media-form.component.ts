import { Component, inject, output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaLinkType, MediaLinkTypeLabels, MediaType, MediaTypeLabels, Visibility, VisibilityLabels } from '../../../models/enums';
import { CreateMediaRequest } from '../../../models/media-create.model';
import { MediaService } from '../../../services/media.service';
import { ActorService } from '../../../services/actor.service';
import { CollectionService } from '../../../services/collection.service';
import { ToastService } from '../../../services/toast.service';
import { MediaCollectionResponse } from '../../../models/collection.model';
import { ServerService } from '../../../services/server-status.service';

@Component({
    selector: 'app-media-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './media-form.component.html',
    styleUrls: ['./media-form.component.scss']
})
export class MediaFormComponent {
    private mediaService = inject(MediaService);
    private actorService = inject(ActorService);
    private collectionService = inject(CollectionService);
    private serviceStatusService = inject(ServerService);
    private toastService = inject(ToastService);
    private cdr = inject(ChangeDetectorRef);

    mediaCreated = output<void>();

    mediaData: CreateMediaRequest = {
        title: '',
        originalTitle: '',
        type: MediaType.Movie,
        releaseYear: new Date().getFullYear(),
        runtimeMinutes: null,
        posterUrl: '',
        visibility: Visibility.Public,
        genres: [],
        tags: [],
        cast: [],
        links: [],
        seasons: [],
        collectionId: null
    };

    genresInput = '';
    tagsInput = '';

    // Для пошуку акторів
    actorSearchQuery = '';
    actorSearchResults = signal<any[]>([]);

    imageError = false;

    mediaTypeOptions = Object.values(MediaType).map(type => ({
        value: type,
        label: MediaTypeLabels[type]
    }));

    visibilityOptions = [
        { value: Visibility.Public, label: VisibilityLabels[Visibility.Public] },
        { value: Visibility.Private, label: VisibilityLabels[Visibility.Private] }
    ];

    get isSeries(): boolean {
        return this.mediaData.type === MediaType.Series;
    }

    onPosterUrlChange() {
        this.imageError = false;
    }

    linkTypeOptions = Object.values(MediaLinkType)
        .filter(v => typeof v === 'number')
        .map(v => ({ value: v as MediaLinkType, label: MediaLinkTypeLabels[v as MediaLinkType] }));

    newLinkName = '';
    newLinkUrl = '';
    newLinkType: MediaLinkType = MediaLinkType.Other;

    addLink() {
        if (!this.newLinkUrl.trim()) {
            return;
        }

        this.mediaData.links.push({
            name: this.newLinkName.trim() || null,
            url: this.newLinkUrl.trim(),
            type: Number(this.newLinkType)
        });

        // Очищаємо інпути
        this.newLinkName = '';
        this.newLinkUrl = '';
    }

    removeLink(index: number) {
        this.mediaData.links.splice(index, 1);
    }

    // Автоматичне додавання та завантаження метаданих при втраті фокусу
    onLinkBlur() {
        setTimeout(() => {
            const url = this.newLinkUrl?.trim();
            if (!url) {
                return;
            }

            // 1. Додаємо посилання у список
            this.mediaData.links.push({
                name: this.newLinkName?.trim() || null,
                url: url,
                type: Number(this.newLinkType)
            });

            // Очищаємо поля
            this.newLinkName = '';
            this.newLinkUrl = '';
            this.cdr.detectChanges(); // Оновлюємо UI для списку посилань

            // 2. Запитуємо метадані
            this.serviceStatusService.getMetadata(url).subscribe({
                next: (meta) => {
                    if (meta) {
                        if (!this.mediaData.title?.trim() && meta.title) {
                            this.mediaData.title = meta.title;
                        }
                        if (!this.mediaData.posterUrl?.trim() && meta.image) {
                            this.mediaData.posterUrl = meta.image;
                        }
                        // Примусово кажемо Angular перемалювати форму з новими даними
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    console.error('Помилка отримання метаданих:', err);
                }
            });
        }, 200);
    }

    // Пошук акторів
    onSearchActors() {
        const query = this.actorSearchQuery.trim();
        if (!query) {
            this.actorSearchResults.set([]);
            return;
        }
        this.actorService.searchActors({ name: query, size: 10 }).subscribe({
            next: (res) => this.actorSearchResults.set(res.items || []),
            error: (err) => console.error('Помилка пошуку акторів:', err)
        });
    }

    addActorToCast(actor: any) {
        const exists = this.mediaData.cast.some(a => a.actorId === (actor.id || actor.actorId));
        if (!exists) {
            this.mediaData.cast.push({
                actorId: actor.id || actor.actorId,
                fullName: actor.fullName,
                characterName: ''
            });
        }
        this.actorSearchQuery = '';
        this.actorSearchResults.set([]);
    }

    removeActor(index: number) {
        this.mediaData.cast.splice(index, 1);
    }

    collectionSearchQuery = '';
    collectionSearchResults = signal<MediaCollectionResponse[]>([]);
    hasSearchedOnce = false;

    onSearchCollections() {
        const query = this.collectionSearchQuery.trim();

        if (!query) {
            this.mediaData.collectionId = null;
            this.collectionSearchResults.set([]);
            this.hasSearchedOnce = false;
            return;
        }

        // Шукаємо колекції на бекенді
        this.collectionService.searchCollections({ query, size: 5 }).subscribe({
            next: (res) => {
                const items = res.items || [];
                this.collectionSearchResults.set(items);
                this.hasSearchedOnce = true;

                // Перевіряємо, чи є точне співпадіння введеного тексту з якоюсь існуючою колекцією
                const exactMatch = items.find(
                    c => c.name.toLowerCase() === query.toLowerCase()
                );

                if (exactMatch) {
                    // Якщо знайшли точний збіг — одразу беремо її ID
                    this.mediaData.collectionId = exactMatch.id;
                } else {
                    // Якщо точного збігу немає — це означає створення нової колекції, ID поки що null
                    this.mediaData.collectionId = null;
                }
            },
            error: (err) => {
                console.error('Помилка пошуку колекцій:', err);
                this.hasSearchedOnce = true;
            }
        });
    }

    // Коли користувач клікає на колекцію з випадаючого списку
    selectCollection(col: MediaCollectionResponse) {
        this.mediaData.collectionId = col.id;
        this.collectionSearchQuery = col.name; // Фіксуємо назву в інпуті
        this.collectionSearchResults.set([]); // Ховаємо дропдаун
    }

    clearCollection() {
        this.mediaData.collectionId = null;
        this.collectionSearchQuery = '';
        this.collectionSearchResults.set([]);
        this.hasSearchedOnce = false;
    }

    // Сезони та епізоди
    addSeason() {
        this.mediaData.seasons.push({ number: this.mediaData.seasons.length + 1, episodes: [] });
    }

    removeSeason(index: number) {
        this.mediaData.seasons.splice(index, 1);
    }

    addEpisode(seasonIndex: number) {
        const season = this.mediaData.seasons[seasonIndex];
        season.episodes.push({ number: season.episodes.length + 1, title: '' });
    }

    removeEpisode(seasonIndex: number, epIndex: number) {
        this.mediaData.seasons[seasonIndex].episodes.splice(epIndex, 1);
    }

    onSubmit() {
        if (!this.mediaData.title.trim()) {
            this.toastService.show('Будь ласка, введіть назву медіа.', 'error');
            return;
        }

        this.mediaData.genres = this.genresInput
            ? this.genresInput.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        this.mediaData.tags = this.tagsInput
            ? this.tagsInput.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        this.toastService.show(`Створення медіа "${this.mediaData.title}" запущено у фоні...`, 'info', 4000);

        // Логіка перевірки колекції: якщо введено текст, але ID не обрано — створюємо нову колекцію
        const collectionNameToCreate = this.collectionSearchQuery.trim();

        if (collectionNameToCreate && !this.mediaData.collectionId) {
            // Спершу створюємо нову колекцію з таким же Visibility
            this.collectionService.createCollection({
                name: collectionNameToCreate,
                visibility: this.mediaData.visibility,
                tags: []
            }).subscribe({
                next: (newCol) => {
                    this.mediaData.collectionId = newCol.id;
                    this.executeCreateMedia();
                },
                error: (err) => {
                    console.error('Помилка створення нової колекції:', err);
                    this.toastService.show(`Не вдалося створити колекцію "${collectionNameToCreate}".`, 'error', 6000);
                }
            });
        } else {
            this.executeCreateMedia();
        }
    }

    private executeCreateMedia() {
        this.mediaService.createMedia(this.mediaData).subscribe({
            next: () => {
                this.toastService.show(`Медіа "${this.mediaData.title}" успішно створено! 🎉`, 'success', 5000);
                this.mediaCreated.emit();
            },
            error: (err) => {
                console.error('Помилка створення медіа:', err);
                this.toastService.show(`Не вдалося створити медіа "${this.mediaData.title}".`, 'error', 6000);
            }
        });
    }
}