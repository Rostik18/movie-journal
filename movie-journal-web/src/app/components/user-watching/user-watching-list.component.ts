import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserWatchingService } from '../../services/user-watching.service';
import { UserWatchingItem } from '../../models/user-watching.model';
import { MediaTypeLabels, WatchStatusLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher.component';

@Component({
    selector: 'app-user-watching-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent],
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

    ngOnInit() {
        this.userWatchingService.searchUserWatchingList().subscribe({
            next: (response) => {
                this.watchingList.set(response.items);
                this.totalCount.set(response.totalCount);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка при завантаженні списку перегляду:', err);
                this.loading.set(false);
            }
        });
    }
}