import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActorService } from '../../services/actor.service';
import { ActorItem } from '../../models/actor.model';
import { VisibilityLabels } from '../../models/enums';

@Component({
    selector: 'app-actor-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './actor-list.component.html',
    styleUrls: ['./actor-list.component.scss']
})
export class ActorListComponent implements OnInit {
    private actorService = inject(ActorService);

    actors = signal<ActorItem[]>([]);
    totalCount = signal<number>(0);
    loading = signal<boolean>(true);

    visibilityLabels = VisibilityLabels;

    ngOnInit() {
        this.actorService.searchActors().subscribe({
            next: (response) => {
                this.actors.set(response.items);
                this.totalCount.set(response.totalCount);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Помилка при завантаженні акторів:', err);
                this.loading.set(false);
            }
        });
    }
}