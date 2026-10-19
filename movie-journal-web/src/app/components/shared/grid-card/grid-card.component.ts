import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Visibility } from '../../../models/enums';

@Component({
    selector: 'app-grid-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './grid-card.component.html',
    styleUrls: ['./grid-card.component.scss'],
})
export class GridCardComponent {
    imageUrl = input<string | null | undefined>();
    imageAlt = input<string>('');
    title = input.required<string>();
    noImageText = input<string>('Немає фото');

    badge = input<string | null | undefined>();
    badgeClass = input<string>('');
    visibility = input<Visibility | string | null | undefined>();

    cardClick = output<void>();
}