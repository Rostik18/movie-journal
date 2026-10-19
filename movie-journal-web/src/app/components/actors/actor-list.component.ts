import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ActorService } from '../../services/actor.service';
import { ToastService } from '../../services/toast.service';
import { ActorItem } from '../../models/actor.model';
import { PageResponse } from '../../models/shared.model';
import { VisibilityLabels } from '../../models/enums';
import { ViewSwitcherComponent } from '../shared/view-switcher/view-switcher.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { ActorFormComponent } from '../shared/actor-form/actor-form.component';
import { GridCardComponent } from '../shared/grid-card/grid-card.component';
import { DetailsSidebarComponent } from '../shared/details-sidebar/details-sidebar.component';

type DeleteCallback = () => ReturnType<ActorService['deleteActor']>;
type ActorId = ActorItem['id'];

@Component({
    selector: 'app-actor-list',
    standalone: true,
    imports: [
        DatePipe,
        ViewSwitcherComponent,
        AddButtonComponent,
        ActorFormComponent,
        GridCardComponent,
        DetailsSidebarComponent
    ],
    templateUrl: './actor-list.component.html',
    styleUrls: ['./actor-list.component.scss']
})
export class ActorListComponent implements OnInit {
    private readonly actorService = inject(ActorService);
    private readonly toastService = inject(ToastService);

    readonly actors = signal<ActorItem[]>([]);
    readonly totalCount = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly isModalOpen = signal(false);

    readonly selectedActor = signal<ActorItem | null>(null);
    readonly isSidebarOpen = signal(false);

    readonly visibilityLabels = VisibilityLabels;

    // Стани для шаблону: початкове завантаження / помилка / порожній список
    readonly showInitialLoading = computed(() => this.loading() && this.actors().length === 0);
    readonly showError = computed(() => this.hasError() && this.actors().length === 0);
    readonly showEmpty = computed(() => !this.loading() && !this.hasError() && this.actors().length === 0);

    private readonly reload$ = new Subject<void>();
    private readonly details$ = new Subject<ActorId>();

    /** Колбеки видалення кешуються, щоб у шаблоні не створювалась нова функція на кожен цикл CD. */
    private readonly deleteCallbacks = new Map<ActorId, DeleteCallback>();

    constructor() {
        // switchMap скасовує попередній запит, якщо список перезавантажили повторно
        this.reload$.pipe(
            tap(() => {
                this.loading.set(true);
                this.hasError.set(false);
            }),
            switchMap(() =>
                this.actorService.searchActors().pipe(
                    map((response: PageResponse<ActorItem>) => ({
                        ok: true as const,
                        items: response.items ?? [],
                        total: response.totalCount ?? response.items?.length ?? 0
                    })),
                    catchError(err => {
                        console.error('Помилка завантаження акторів:', err);
                        return of({ ok: false as const });
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(result => {
            if (result.ok) {
                this.actors.set(result.items);
                this.totalCount.set(result.total);
            } else {
                this.hasError.set(true);
                this.toastService.show('Не вдалося завантажити акторів.', 'error', 4000);
            }
            this.loading.set(false);
        });

        // Швидкі кліки по різних акторах: відповідь на попередній запит скасовується
        this.details$.pipe(
            switchMap(id =>
                this.actorService.getActorById(id).pipe(
                    catchError(err => {
                        console.error('Помилка завантаження деталей актора:', err);
                        this.toastService.show('Не вдалося завантажити деталі актора', 'error');
                        return EMPTY;
                    })
                )
            ),
            takeUntilDestroyed()
        ).subscribe(detailedActor => {
            this.selectedActor.set(detailedActor);
            this.isSidebarOpen.set(true);
        });
    }

    ngOnInit(): void {
        this.loadActors();
    }

    loadActors(): void {
        this.reload$.next();
    }

    // ====================== Деталі (сайдбар) ======================
    openDetails(actor: ActorItem): void {
        this.details$.next(actor.id);
    }

    /**
     * selectedActor навмисно не скидається: поки панель виїжджає, її вміст має лишатись на місці.
     * Наступне відкриття перезаписує його свіжими даними.
     */
    closeSidebar(): void {
        this.isSidebarOpen.set(false);
    }

    onEditActor(): void {
        // Тут у майбутньому ви відкриєте форму редагування
        console.log('Редагувати актора:', this.selectedActor()?.id);
    }

    // ====================== Видалення ======================
    getDeleteCallback(actor: ActorItem): DeleteCallback {
        const actorId = actor.id;

        let callback = this.deleteCallbacks.get(actorId);
        if (!callback) {
            callback = () => this.actorService.deleteActor(actorId);
            this.deleteCallbacks.set(actorId, callback);
        }
        return callback;
    }

    onDeleted(actor: ActorItem): void {
        const actorId = actor.id;

        this.deleteCallbacks.delete(actorId);
        this.actors.update(list => list.filter(a => a.id !== actorId));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.show('Актора успішно видалено', 'success', 3000);
    }

    // ====================== Модальне вікно ======================
    openModal(): void {
        this.isModalOpen.set(true);
    }

    closeModal(): void {
        this.isModalOpen.set(false);
    }

    /** Закриваємо лише коли mousedown стався саме на підложці (а не після виділення тексту). */
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

    onActorCreated(): void {
        this.closeModal();
        this.loadActors();
    }

    onSidebarActorDeleted() {
        const actor = this.selectedActor();
        if (!actor) return;

        const actorId = actor.id;
        this.actors.update(list => list.filter(a => a.id !== actorId));
        this.totalCount.update(c => c - 1);
        this.toastService.show('Актора успішно видалено', 'success', 3000);
        this.closeSidebar(); // Закриваємо сайдбар після видалення
    }
}