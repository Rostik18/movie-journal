import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { CollectionService } from '../../services/collection.service';
import { Visibility, WatchStatus, MediaType, VisibilityLabels, WatchStatusLabels, MediaTypeLabels } from '../../models/enums';
import { ServerService, SeedUserWatchRequest, SeedActorsRequest, SeedCreatorsRequest } from '../../services/server.service';
import { MediaCollectionResponse } from '../../models/collection.model';

@Component({
    selector: 'app-seed-data-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './seed-data-form.component.html',
    styleUrls: ['./seed-data-form.component.scss']
})
export class SeedDataFormComponent implements OnInit {
    private serverService = inject(ServerService);
    private collectionService = inject(CollectionService);
    private toastService = inject(ToastService);

    seedMode = signal<'userWatch' | 'actors' | 'creators'>('actors');

    // Моделі для форми
    payloadText = signal('');
    selectedVisibility = signal<Visibility>(Visibility.Private);
    selectedStatus = signal<WatchStatus>(WatchStatus.Watched);
    selectedType = signal<MediaType>(MediaType.Video);
    tagsInput = signal('');
    selectedCollectionId = signal<string | null>(null);

    // Сигнали для тексту результатів/пропущених рядків
    missedLinesText = signal<string>('');
    actorResultText = signal<string>('');
    creatorResultText = signal<string>('');
    creatorLastError = signal<string>('');

    collections = signal<MediaCollectionResponse[]>([]);
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

    ngOnInit(): void {
        this.loadCollections();
    }

    loadCollections(): void {
        this.collectionService.searchCollections({ size: 100 }).subscribe({
            next: (res) => {
                this.collections.set(res.items ?? []);
            },
            error: (err) => {
                console.error('Не вдалося завантажити колекції:', err);
            }
        });
    }

    onSubmit() {
        const text = this.payloadText().trim();
        if (!text) {
            this.toastService.show('Будь ласка, введіть дані для Payload', 'error');
            return;
        }

        this.loading.set(true);
        this.missedLinesText.set('');
        this.actorResultText.set(''); // Очищуємо попередні результати акторів
        this.creatorResultText.set('');
        this.creatorLastError.set('');

        if (this.seedMode() === 'actors') {
            const request: SeedActorsRequest = {
                userId: null,
                visibility: this.selectedVisibility(),
                payload: text
            };

            this.serverService.seedActorsData(request).subscribe({
                next: (response) => {
                    this.loading.set(false);

                    this.toastService.show(`Імпорт акторів завершено: ${response.message ?? 'Done'}`, 'success', 4000);

                    if (response.missedActors && response.missedActors.length > 0) {
                        const formattedActors = response.missedActors.map(item => {
                            const parts = [item.fullName];
                            parts.push(item.photoUrl ?? '');
                            parts.push(item.birthDate ? new Date(item.birthDate).toISOString().split('T')[0] : '');
                            return parts.join('\t');
                        }).join('\n');

                        this.actorResultText.set(formattedActors);
                        this.toastService.show(`Пропущено акторів: ${response.missedActors.length}`, 'success', 4000);
                    } else {
                        this.submitted.emit();
                    }
                },
                error: (err) => {
                    this.loading.set(false);
                    console.error('Помилка seed акторів:', err);
                    this.toastService.show('Помилка при виконанні seed акторів', 'error', 4000);
                }
            });
        } else if (this.seedMode() === 'creators') {
            const request: SeedCreatorsRequest = {
                userId: null,
                visibility: this.selectedVisibility(),
                payload: text
            };

            this.serverService.seedCreatorsData(request).subscribe({
                next: (response) => {
                    this.loading.set(false);

                    this.toastService.show(`Імпорт авторів завершено: ${response.message ?? 'Done'}`, 'success', 4000);

                    const missed = response.missedCreators ?? [];
                    if (response.lastError) {
                        this.creatorLastError.set(response.lastError);
                    }

                    if (missed.length > 0) {
                        // Той самий формат, що й на вході (Назва / Опис / Лого / Вебсайт) — можна одразу вставити назад
                        this.creatorResultText.set(missed.map(item => [
                            item.name,
                            item.description ?? '',
                            item.imageUrl ?? '',
                            item.websiteUrl ?? ''
                        ].join('\t')).join('\n'));
                        this.toastService.show(`Пропущено авторів: ${missed.length}`, 'error', 5000);
                    } else if (!response.lastError) {
                        this.submitted.emit();
                    }
                },
                error: (err) => {
                    this.loading.set(false);
                    console.error('Помилка seed авторів:', err);
                    this.toastService.show('Помилка при виконанні seed авторів', 'error', 4000);
                }
            });
        } else {
            const tags = this.tagsInput()
                ? this.tagsInput().split(',').map(t => t.trim()).filter(Boolean)
                : [];

            const collectionIdVal = this.selectedCollectionId();

            const request: SeedUserWatchRequest = {
                userId: null,
                visibility: this.selectedVisibility(),
                status: this.selectedStatus(),
                type: this.selectedType(),
                tags: tags,
                collectionId: collectionIdVal ? collectionIdVal : null,
                payload: text
            };

            this.serverService.seedUserWatchData(request).subscribe({
                next: (response) => {
                    this.loading.set(false);

                    this.toastService.show(`Імпорт завершено: ${response.message ?? 'Done'}`, 'success', 4000);

                    if (response.missedLines && response.missedLines.length > 0) {
                        const formattedLines = response.missedLines.map(item => {
                            const parts = [item.url];
                            if (item.name !== undefined && item.name !== null) {
                                parts.push(item.name);
                            }
                            if (item.rate !== undefined && item.rate !== null) {
                                parts.push(item.rate.toString());
                            }
                            return parts.join('\t');
                        }).join('\n');

                        this.missedLinesText.set(formattedLines);
                        this.toastService.show(`Знайдено ${response.missedLines.length} пропущених рядків.`, 'error', 5000);
                    } else {
                        this.submitted.emit();
                    }
                },
                error: (err) => {
                    this.loading.set(false);
                    console.error('Помилка seed запиту:', err);
                    this.toastService.show('Помилка при виконанні seed запиту', 'error', 4000);
                }
            });
        }
    }

    copyText(textToCopy: string): void {
        if (!textToCopy) return;

        navigator.clipboard.writeText(textToCopy).then(() => {
            this.toastService.show('Скопійовано в буфер обміну! 📋', 'success', 2500);
        }).catch(err => {
            console.error('Не вдалося скопіювати:', err);
            this.toastService.show('Помилка копіювання.', 'error', 3000);
        });
    }

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