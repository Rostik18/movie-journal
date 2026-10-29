import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { CollectionService } from '../../services/collection.service';
import { Visibility, WatchStatus, MediaType, VisibilityLabels, WatchStatusLabels, MediaTypeLabels } from '../../models/enums';
import { ServerService, SeedUserWatchRequest, SeedActorsRequest, SeedCreatorsRequest, SeedCollectionsRequest } from '../../services/server.service';
import { MediaCollectionResponse } from '../../models/collection.model';

@Component({
    selector: 'app-seed-data-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './seed-data-form.component.html',
    styleUrls: ['./seed-data-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeedDataFormComponent implements OnInit {
    private serverService = inject(ServerService);
    private collectionService = inject(CollectionService);
    private toastService = inject(ToastService);
    private destroyRef = inject(DestroyRef);

    seedMode = signal<'userWatch' | 'actors' | 'creators' | 'collections'>('actors');

    // Моделі для форми
    payloadText = signal('');
    selectedVisibility = signal<Visibility>(Visibility.Private);
    tagsInput = signal('');
    selectedCollectionId = signal<string | null>(null);

    // Сигнали для тексту результатів/пропущених рядків
    missedLinesText = signal<string>('');
    actorResultText = signal<string>('');
    creatorResultText = signal<string>('');
    creatorLastError = signal<string>('');
    collectionResultText = signal<string>('');
    collectionLastError = signal<string>('');

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
        this.collectionService.searchCollections({ size: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        this.collectionResultText.set('');
        this.collectionLastError.set('');

        if (this.seedMode() === 'actors') {
            const request: SeedActorsRequest = {
                userId: null,
                visibility: this.selectedVisibility(),
                payload: text
            };

            this.serverService.seedActorsData(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

            this.serverService.seedCreatorsData(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        } else if (this.seedMode() === 'collections') {
            const request: SeedCollectionsRequest = {
                userId: null,
                visibility: this.selectedVisibility(),
                tags: this.parseTags(),
                payload: text
            };

            this.serverService.seedCollectionsData(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (response) => {
                    this.loading.set(false);

                    this.toastService.show(`Імпорт колекцій завершено: ${response.message ?? 'Done'}`, 'success', 4000);

                    const missed = response.missedLines ?? [];
                    if (response.lastError) {
                        this.collectionLastError.set(response.lastError);
                    }

                    if (missed.length > 0) {
                        // Той самий формат, що й на вході (Назва / Опис / Постер / Теги) — можна одразу вставити назад
                        this.collectionResultText.set(missed.map(item => [
                            item.name,
                            item.description ?? '',
                            item.imageUrl ?? '',
                            (item.tags ?? []).join(', ')
                        ].join('\t')).join('\n'));
                        this.toastService.show(`Пропущено колекцій: ${missed.length}`, 'error', 5000);
                    } else if (!response.lastError) {
                        this.submitted.emit();
                    }
                },
                error: (err) => {
                    this.loading.set(false);
                    console.error('Помилка seed колекцій:', err);
                    this.toastService.show('Помилка при виконанні seed колекцій', 'error', 4000);
                }
            });
        } else {
            const tags = this.parseTags();

            const collectionIdVal = this.selectedCollectionId();

            const request: SeedUserWatchRequest = {
                userId: null,
                visibility: this.selectedVisibility(),
                tags: tags,
                collectionId: collectionIdVal ? collectionIdVal : null,
                payload: text
            };

            this.serverService.seedUserWatchData(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

    private parseTags(): string[] {
        return this.tagsInput()
            ? this.tagsInput().split(',').map(t => t.trim()).filter(Boolean)
            : [];
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
        this.serverService.clearDatabase().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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