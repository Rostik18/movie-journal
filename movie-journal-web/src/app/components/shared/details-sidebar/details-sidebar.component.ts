import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, afterNextRender, computed, effect, inject, input, linkedSignal, output, untracked, viewChild } from '@angular/core';
import { DeleteButtonComponent } from '../delete-button/delete-button.component';
import { Observable } from 'rxjs';
import { UserService } from '../../../services/user.service';

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let nextSidebarId = 0;

@Component({
    selector: 'app-details-sidebar',
    standalone: true,
    imports: [DeleteButtonComponent],
    templateUrl: './details-sidebar.component.html',
    styleUrls: ['./details-sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailsSidebarComponent {
    private readonly injector = inject(Injector);
    private readonly userService = inject(UserService);

    readonly isOpen = input(false);
    readonly title = input.required<string>();
    readonly imageUrl = input<string | null | undefined>();
    readonly imageAlt = input('');
    readonly noImageText = input('Немає фото');
    readonly deleteAction = input<() => Observable<unknown>>();

    readonly closed = output<void>();
    readonly editClicked = output<void>();
    readonly deleted = output<void>();

    readonly titleId = `details-sidebar-title-${nextSidebarId++}`;

    private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
    private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

    /** Скидається при кожній зміні imageUrl, тому нове фото отримує нову спробу завантаження. */
    readonly imageFailed = linkedSignal(() => {
        this.imageUrl();
        return false;
    });
    readonly hasImage = computed(() => !!this.imageUrl() && !this.imageFailed());

    private previouslyFocused: HTMLElement | null = null;

    get isAdmin(): boolean {
        return this.userService.isAdmin();
    }

    constructor() {
        effect(() => {
            const open = this.isOpen();

            untracked(() => {
                if (open) {
                    this.previouslyFocused = document.activeElement as HTMLElement | null;
                    afterNextRender(() => this.closeButton().nativeElement.focus(), {
                        injector: this.injector
                    });
                } else {
                    this.previouslyFocused?.focus?.();
                    this.previouslyFocused = null;
                }
            });
        });
    }

    onBackdropMouseDown(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closed.emit();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isOpen()) {
            this.closed.emit();
        }
    }

    @HostListener('keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (!this.isOpen() || event.key !== 'Tab') {
            return;
        }

        const focusable = Array.from(
            this.panel().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }
}