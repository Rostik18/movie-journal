import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActorService } from '../../services/actor.service';
import { ActorItem } from '../../models/actor.model';
import { VisibilityLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { ActorFormComponent } from '../shared/actor-form/actor-form.component';
import { ToastService } from '../../services/toast.service';
import { DeleteButtonComponent } from '../shared/delete-button/delete-button.component';
import { UserService } from '../../services/user.service';
import { PageResponse } from '../../models/shared.model';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';

@Component({
    selector: 'app-actor-list',
    standalone: true,
    imports: [CommonModule, ViewSwitcherComponent, AddButtonComponent, ActorFormComponent, DeleteButtonComponent, GridCardComponent],
    templateUrl: './actor-list.component.html',
    styleUrls: ['./actor-list.component.scss']
})
export class ActorListComponent implements OnInit {
    private actorService = inject(ActorService);
    private toastService = inject(ToastService);
    userService = inject(UserService);

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
            next: (response: PageResponse<ActorItem>) => {
                this.actors.set(response.items);
                this.actors.update(list => list);
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

    getDeleteCallback(actor: ActorItem) {
        const actorId = actor.id;
        return () => this.actorService.deleteActor(actorId);
    }

    onDeleted(actor: ActorItem) {
        const actorId = actor.id;
        this.actors.update(list => list.filter(a => a.id !== actorId));
        this.totalCount.update(c => c - 1);
        this.toastService.show('Актора успішно видалено', 'success', 3000);
    }
}