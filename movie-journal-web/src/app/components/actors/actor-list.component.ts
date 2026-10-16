import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActorService } from '../../services/actor.service';
import { ActorItem } from '../../models/actor.model';
import { VisibilityLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { ActorFormComponent } from '../shared/actor-form/actor-form.component';

@Component({
    selector: 'app-actor-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, AddButtonComponent, ActorFormComponent],
    templateUrl: './actor-list.component.html',
    styleUrls: ['./actor-list.component.scss']
})
export class ActorListComponent implements OnInit {
    private actorService = inject(ActorService);

    actors = signal<ActorItem[]>([]);
    totalCount = signal<number>(0);
    loading = signal<boolean>(true);

    visibilityLabels = VisibilityLabels;

    // Сигнал для перемикання видів ('grid' або 'list')
    viewMode = signal<'grid' | 'list'>('grid');
    // Сигнал для модального вікна
    isModalOpen = signal<boolean>(false);

    ngOnInit() {
        this.loadActors();
    }

    loadActors() {
        this.loading.set(true);
        this.actorService.searchActors().subscribe({
            next: (response: any) => {
                this.actors.set(response.items || response);
                this.totalCount.set(response.totalCount || (response.items ? response.items.length : 0));
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка завантаження акторів:', err);
                this.loading.set(false);
            }
        });
    }

    openModal() {
        this.isModalOpen.set(true);
    }

    closeModal() {
        this.isModalOpen.set(false);
    }

    onActorCreated() {
        this.closeModal();
        this.loadActors();
    }
}