import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';

import { LinkType, LinkTypeLabels } from '../../../models/enums';
import { MediaLink } from '../../../models/media.model';
import { ToastService } from '../../../services/toast.service';
import { VideoPlayerComponent } from '../video-player/video-player.component';

/**
 * Блок «Посилання» для сайдбарів медіа: плеєр для Embed/Video-посилань (якщо є) та список усіх посилань
 * з копіюванням і типом. Стилі рядків — глобальні (.links-section у styles.scss).
 */
@Component({
    selector: 'app-media-links',
    standalone: true,
    imports: [VideoPlayerComponent],
    templateUrl: './media-links.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaLinksComponent {
    private readonly toastService = inject(ToastService);

    readonly links = input<MediaLink[]>([]);
    readonly posterUrl = input<string | null>(null);
    readonly title = input('');

    readonly LinkType = LinkType;
    readonly typeLabels = LinkTypeLabels;

    /** Посилання, які можна відтворити в UI. */
    readonly playable = computed(() => this.links().filter(l => l.type === LinkType.Embed || l.type === LinkType.Video));

    /** Індекс обраного відео; при зміні списку повертається до першого. */
    readonly selectedIndex = linkedSignal<MediaLink[], number>({ source: this.playable, computation: () => 0 });
    readonly current = computed(() => this.playable()[this.selectedIndex()] ?? null);

    copy(url: string): void {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.show('Посилання скопійовано в буфер обміну! 📋', 'success', 2500);
        }).catch(() => {
            this.toastService.show('Помилка копіювання посилання.', 'error', 3000);
        });
    }
}