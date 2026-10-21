import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { UserWatchingService } from '../../services/user-watching.service';
import { ToastService } from '../../services/toast.service';
import { UserWatchingItem } from '../../models/user-watching.model';
import { MediaItem } from '../../models/media.model';
import { MediaTypeLabels, WatchStatus, WatchStatusLabels } from '../../models/enums';
import { formatDuration, formatSubtitle, formatTimecode } from '../../utils/media-format.util';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { UserWatchingFormComponent } from '../shared/user-watching-form/user-watching-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';
import { DatePipe } from '@angular/common';

type DeleteCallback = () => ReturnType<UserWatchingService['deleteUserWatching']>;

@Component({
    selector: 'app-user-watching-list',
    standalone: true,
    imports: [
        ViewSwitcherComponent,
        AddButtonComponent,
        UserWatchingFormComponent,
        RatingStarsComponent,
        GridCardComponent,
        DetailsSidebarComponent,
        DatePipe
    ],
    templateUrl: './user-watching-list.component.html',
    styleUrls: ['./user-watching-list.component.scss']
})
export class UserWatchingListComponent implements OnInit {
    private readonly userWatchingService = inject(UserWatchingService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly watchingList = signal<UserWatchingItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);

    // Стан сайдбару деталей
    readonly selectedItem = signal<UserWatchingItem | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly watchStatusLabels = WatchStatusLabels;
    readonly mediaTypeLabels = MediaTypeLabels;

    // Форматування, спільне зі списком фільмів (utils/media-format.util.ts)
    readonly subtitle = formatSubtitle;
    readonly formatDuration = formatDuration;
    readonly formatTimecode = formatTimecode;

    // Окремий стан для шаблону: початкове завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.watchingList().length === 0);
    readonly showError = computed(() => this.hasError() && this.watchingList().length === 0);
    readonly showEmpty = computed(
        () => !this.loading() && !this.hasError() && this.watchingList().length === 0
    );

    private readonly reload$ = new Subject<void>();
    private readonly deleteCallbacks = new Map<string, DeleteCallback>();

    readonly selectedDeleteCallback = computed(() => {
        const item = this.selectedItem();
        return item ? this.getDeleteCallback(item) : undefined;
    });

    constructor() {
        // switchMap скасовує попередній запит, якщо список перезавантажили повторно
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.userWatchingService.searchUserWatchingList().pipe(
                    map(res => ({ ok: true as const, ...this.normalizeResponse(res) })),
                    catchError(err => {
                        console.error('Помилка завантаження списку перегляду:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.watchingList.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити список перегляду.', 'error', 4000);
            }
            this.loading.set(false);
        });
    }

    ngOnInit(): void {
        this.loadList();
    }

    loadList(): void {
        this.reload$.next();
    }

    /** API може повертати як сторінку { items, totalCount }, так і простий масив. */
    private normalizeResponse(res: any): { items: UserWatchingItem[]; total: number } {
        const items: UserWatchingItem[] = Array.isArray(res) ? res : (res?.items ?? []);
        const total: number = res?.totalCount ?? items.length;
        return { items, total };
    }

    // ====================== Відображення полів ======================
    /** Бейдж оцінки на постері: «★ 7». Для null бейджа немає. */
    ratingBadge(rating: number | null | undefined): string | null {
        return rating == null ? null : `★ ${rating}`;
    }

    typeLabel(type: MediaItem['type'] | null | undefined): string {
        return type == null ? '—' : (this.mediaTypeLabels[type] ?? String(type));
    }

    /** «Сезон 2 / Серія 5»; якщо задано лише одне з чисел, зайвого роздільника немає. */
    progressLabel(item: UserWatchingItem): string {
        const parts: string[] = [];
        if (item.currentSeasonNumber) {
            parts.push(`Сезон ${item.currentSeasonNumber}`);
        }
        if (item.currentEpisodeNumber) {
            parts.push(`Серія ${item.currentEpisodeNumber}`);
        }
        return parts.join(' / ');
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(item: UserWatchingItem): void {
        this.selectedItem.set(item);
        this.isSidebarOpen.set(true);
    }

    closeSidebar(): void {
        this.isSidebarOpen.set(false);
    }

    onEditItem(): void {
        console.log('Редагувати елемент списку:', this.selectedItem()?.media?.id);
    }

    // ====================== Рейтинг ======================
    /** Оптимістичне оновлення: одразу показуємо нову оцінку, при помилці відкочуємо. */
    updateRating(item: UserWatchingItem, newRating: number): void {
        const mediaId = item.media?.id;
        if (!mediaId) {
            return;
        }

        const previousRating = item.rating;
        this.patchItem(mediaId, { rating: newRating });

        this.userWatchingService.updateWatchlist({ mediaId, rating: newRating, status: WatchStatus.Watched }).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => this.toastService.show(`Рейтинг оновлено: ${newRating}/10 ⭐`, 'success', 2500),
            error: err => {
                console.error('Помилка оновлення рейтингу:', err);
                this.patchItem(mediaId, { rating: previousRating });
                this.toastService.show('Не вдалося оновити рейтинг.', 'error', 4000);
            }
        });
    }

    private patchItem(mediaId: string, patch: Partial<UserWatchingItem>): void {
        this.watchingList.update(list =>
            list.map(i => (i.media?.id === mediaId ? { ...i, ...patch } : i))
        );
    }

    // ====================== Видалення ======================
    getDeleteCallback(item: UserWatchingItem): DeleteCallback {
        const mediaId = item.media.id;

        let callback = this.deleteCallbacks.get(mediaId);
        if (!callback) {
            callback = () => this.userWatchingService.deleteUserWatching(mediaId);
            this.deleteCallbacks.set(mediaId, callback);
        }
        return callback;
    }

    onItemDeleted(item: UserWatchingItem): void {
        const mediaId = item.media.id;

        this.deleteCallbacks.delete(mediaId);
        this.watchingList.update(list => list.filter(i => i.media?.id !== mediaId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Успішно видалено зі списку перегляду', 'success', 3000);
    }

    onSidebarItemDeleted(): void {
        const item = this.selectedItem();
        if (!item) {
            return;
        }

        this.onItemDeleted(item);
        this.closeSidebar();
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
    }

    onBackdropMouseDown(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isModalOpen()) {
            this.closeModal();
        }
    }

    onWatchingCreated(): void {
        this.closeModal();
        this.loadList();
    }
}