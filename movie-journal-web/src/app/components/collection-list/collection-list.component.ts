import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectionService } from '../../services/collection.service';
import { MediaCollectionResponse } from '../../models/collection.model';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { CollectionFormComponent } from '../shared/collection-form/collection-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { DeleteButtonComponent } from '../shared/delete-button/delete-button.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';

@Component({
    selector: 'app-collection-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, AddButtonComponent, CollectionFormComponent, DeleteButtonComponent, GridCardComponent],
    templateUrl: './collection-list.component.html',
    styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit {
    private collectionService = inject(CollectionService);
    private toastService = inject(ToastService);
    userService = inject(UserService);

    collections = signal<MediaCollectionResponse[]>([]);
    totalCount = signal<number>(0);
    loading = signal<boolean>(true);
    viewMode = signal<'grid' | 'list'>('grid');

    visibilityLabels = VisibilityLabels;

    isModalOpen = signal<boolean>(false);

    openModal() { this.isModalOpen.set(true); }
    closeModal() { this.isModalOpen.set(false); }

    onCollectionCreated() {
        this.closeModal();
        this.loadCollections();
    }

    ngOnInit() {
        this.loadCollections();
    }

    loadCollections() {
        this.loading.set(true);
        this.collectionService.searchCollections().subscribe({
            next: (res) => {
                this.collections.set(res.items);
                this.collections.update(list => list);
                this.totalCount.set(res.totalCount);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка завантаження колекцій:', err);
                this.loading.set(false);
            }
        });
    }

    getDeleteCallback(col: MediaCollectionResponse) {
        const colId = col.id;
        return () => this.collectionService.deleteCollection(colId);
    }

    onDeleted(col: MediaCollectionResponse) {
        const colId = col.id;
        this.collections.update(list => list.filter(c => c.id !== colId));
        this.totalCount.update(c => c - 1);
        this.toastService.show('Колекцію успішно видалено', 'success', 3000);
    }
}