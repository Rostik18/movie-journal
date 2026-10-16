import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaType, MediaTypeLabels, Visibility, VisibilityLabels } from '../../../models/enums';
import { CreateMediaRequest } from '../../../models/media-create.model';
import { MediaService } from '../../../services/media.service';
import { ActorService } from '../../../services/actor.service';
import { CollectionService } from '../../../services/collection.service';
import { ToastService } from '../../../services/toast.service';
import { MediaCollectionResponse } from '../../../models/collection.model';

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
    private collectionService = inject(CollectionService); // Впроваджуємо сервіс колекцій
    private toastService = inject(ToastService);

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

    // Для вибору / пошуку колекцій
    collectionSearchQuery = '';
    collectionSearchResults = signal<MediaCollectionResponse[]>([]);
    selectedCollectionName = ''; // Відображувана назва обраної колекції

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

    // Пошук колекцій під час введення
    onSearchCollections() {
        const query = this.collectionSearchQuery.trim();
        this.selectedCollectionName = query; // Зберігаємо те, що ввів користувач

        if (!query) {
            this.mediaData.collectionId = null;
            this.collectionSearchResults.set([]);
            return;
        }

        this.collectionService.searchCollections({ query, size: 5 }).subscribe({
            next: (res) => this.collectionSearchResults.set(res.items || []),
            error: (err) => console.error('Помилка пошуку колекцій:', err)
        });
    }

    // Вибір існуючої колекції з випадаючого списку
    selectCollection(col: MediaCollectionResponse) {
        this.mediaData.collectionId = col.id;
        this.collectionSearchQuery = col.name;
        this.selectedCollectionName = col.name;
        this.collectionSearchResults.set([]);
    }

    // Очищення вибору колекції
    clearCollection() {
        this.mediaData.collectionId = null;
        this.collectionSearchQuery = '';
        this.selectedCollectionName = '';
        this.collectionSearchResults.set([]);
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