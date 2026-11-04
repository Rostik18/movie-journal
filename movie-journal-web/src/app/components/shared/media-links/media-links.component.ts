import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { LinkType, LinkTypeLabels } from '../../../models/enums';
import { MediaLink } from '../../../models/media.model';
import { ToastService } from '../../../services/toast.service';

/**
 * Блок «Посилання» для сайдбарів медіа: список усіх посилань з копіюванням і типом.
 * Відео відтворюється кнопкою ▶ на постері сайдбару (app-details-sidebar). Стилі рядків — глобальні (.links-section у styles.scss).
 */
@Component({
    selector: 'app-media-links',
    standalone: true,
    templateUrl: './media-links.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaLinksComponent {
    private readonly toastService = inject(ToastService);

    readonly links = input<MediaLink[]>([]);

    readonly LinkType = LinkType;
    readonly typeLabels = LinkTypeLabels;

    copy(url: string): void {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.show('Посилання скопійовано в буфер обміну! 📋', 'success', 2500);
        }).catch(() => {
            this.toastService.show('Помилка копіювання посилання.', 'error', 3000);
        });
    }
}