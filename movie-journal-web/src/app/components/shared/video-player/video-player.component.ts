import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

import { LinkType } from '../../../models/enums';
import { MediaLink } from '../../../models/media.model';

/**
 * Плеєр для посилань типу Embed (iframe) і Video (файл).
 *
 * Нічого не вантажить, доки користувач не натисне ▶: у сайдбарі не з'являється чужий iframe/трафік,
 * а відео не стартує саме. При зміні посилання плеєр повертається до заставки.
 * Якщо вбудувати не вдалося (сайт забороняє iframe, файл недоступний) — пропонуємо відкрити посилання на сайті.
 */
@Component({
    selector: 'app-video-player',
    standalone: true,
    templateUrl: './video-player.component.html',
    styleUrls: ['./video-player.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPlayerComponent {
    private readonly sanitizer = inject(DomSanitizer);

    readonly link = input.required<MediaLink>();
    readonly posterUrl = input<string | null>(null);
    readonly title = input('');
    /** Одразу запускати відео, без заставки з кнопкою ▶ (коли користувач уже натиснув ▶ деінде). */
    readonly autoplay = input(false);

    readonly LinkType = LinkType;

    /** Скидається при зміні посилання. */
    readonly playing = linkedSignal<MediaLink, boolean>({ source: this.link, computation: () => this.autoplay() });
    readonly failed = linkedSignal<MediaLink, boolean>({ source: this.link, computation: () => false });

    /**
     * ЕКСПЕРИМЕНТ: дозволяємо і http, і https (http у https-застосунку браузер усе одно заблокує як mixed content).
     * javascript:/data:/blob: лишаємо забороненими: у iframe вони виконувались би з доступом до вашого сайту.
     */
    private readonly isHttps = computed(() => {
        try {
            const protocol = new URL(this.link().url).protocol;
            return protocol === 'https:' || protocol === 'http:';
        } catch {
            return false;
        }
    });

    readonly canPlay = computed(() => this.isHttps() && !this.failed());

    readonly embedUrl = computed<SafeResourceUrl | null>(() =>
        this.isHttps() && this.link().type === LinkType.Embed
            ? this.sanitizer.bypassSecurityTrustResourceUrl(this.link().url)
            : null
    );

    play(): void {
        this.playing.set(true);
    }
}