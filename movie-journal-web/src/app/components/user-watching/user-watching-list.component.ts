import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserWatchingService } from '../../services/user-watching.service';
import { UserWatchingItem } from '../../models/user-watching.model';
import { MediaTypeLabels, WatchStatusLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher.component';
import { UserWatchingFormComponent } from '../shared/user-watching-form/user-watching-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';

@Component({
    selector: 'app-user-watching-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, AddButtonComponent, UserWatchingFormComponent],
    templateUrl: './user-watching-list.component.html',
    styleUrls: ['./user-watching-list.component.scss']
})
export class UserWatchingListComponent implements OnInit {
    private userWatchingService = inject(UserWatchingService);

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

    openModal() { this.isModalOpen.set(true); }
    closeModal() { this.isModalOpen.set(false); }

    onWatchingCreated() {
        this.closeModal();
        this.loadList();
    }
}