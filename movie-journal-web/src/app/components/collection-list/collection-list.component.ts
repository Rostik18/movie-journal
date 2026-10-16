import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectionService } from '../../services/collection.service';
import { MediaCollectionResponse } from '../../models/collection.model';
import { ViewSwitcherComponent } from '../shared/view-switcher.component';
import { Visibility, VisibilityLabels } from '../../models/enums';
import { CollectionFormComponent } from '../shared/collection-form/collection-form.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';

@Component({
    selector: 'app-collection-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, AddButtonComponent, CollectionFormComponent],
    templateUrl: './collection-list.component.html',
    styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit {
    private collectionService = inject(CollectionService);

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
                this.totalCount.set(res.totalCount);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка завантаження колекцій:', err);
                this.loading.set(false);
            }
        });
    }
}