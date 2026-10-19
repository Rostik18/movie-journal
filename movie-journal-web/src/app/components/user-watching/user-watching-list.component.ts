import { Component, OnInit, inject, signal } from '@angular/core';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { CommonModule } from '@angular/common';
import { UserWatchingService } from '../../services/user-watching.service';
import { UserWatchingItem } from '../../models/user-watching.model';
import { MediaTypeLabels, WatchStatusLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { UserWatchingFormComponent } from '../shared/user-watching-form/user-watching-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { ToastService } from '../../services/toast.service';
import { DeleteButtonComponent } from '../shared/delete-button/delete-button.component';

@Component({
    selector: 'app-user-watching-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, AddButtonComponent, UserWatchingFormComponent, RatingStarsComponent, DeleteButtonComponent, GridCardComponent],
    templateUrl: './user-watching-list.component.html',
    styleUrls: ['./user-watching-list.component.scss']
})
export class UserWatchingListComponent implements OnInit {
    private userWatchingService = inject(UserWatchingService);
    private toastService = inject(ToastService);

    watchingList = signal<UserWatchingItem[]>([]);
    totalCount = signal<number>(0);
    loading = signal<boolean>(true);

    mediaTypeLabels = MediaTypeLabels;
    watchStatusLabels = WatchStatusLabels;

    viewMode = signal<'grid' | 'list'>('grid');

    isModalOpen = signal<boolean>(false);

    ngOnInit() {
        this.loadList();
    }

    loadList() {
        this.loading.set(true);
        this.userWatchingService.searchUserWatchingList().subscribe({
            next: (res: any) => {
                this.watchingList.set(res.items || res);
                this.totalCount.set(res.totalCount || (res.items ? res.items.length : 0));
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка завантаження списку перегляду:', err);
                this.loading.set(false);
            }
        });
    }

    updateRating(item: UserWatchingItem, newRating: number) {
        const mediaId = item.media?.id;
        if (!mediaId) return;

        this.userWatchingService.updateWatchlist({
            mediaId: mediaId,
            rating: newRating
        }).subscribe({
            next: () => {
                item.rating = newRating; // Оновлюємо локально без перезавантаження всього списку
                this.toastService.show(`Рейтинг оновлено: ${newRating}/10 ⭐`, 'success', 2500);
            },
            error: (err) => {
                console.error('Помилка оновлення рейтингу:', err);
                this.toastService.show('Не вдалося оновити рейтинг.', 'error', 4000);
            }
        });
    }

    openModal() { this.isModalOpen.set(true); }
    closeModal() { this.isModalOpen.set(false); }

    onWatchingCreated() {
        this.closeModal();
        this.loadList();
    }

    // Повертаємо функцію запиту для конкретного елемента
    getDeleteCallback(item: UserWatchingItem) {
        const mediaId = item.media?.id;
        return () => this.userWatchingService.deleteUserWatching(mediaId);
    }

    // Що зробити після успішного видалення (оновлення списку)
    onItemDeleted(item: UserWatchingItem) {
        const mediaId = item.media?.id;
        this.watchingList.update(list => list.filter(i => i.media?.id !== mediaId));
        this.totalCount.update(c => c - 1);
        this.toastService.show('Успішно видалено зі списку перегляду', 'success', 3000);
    }
}