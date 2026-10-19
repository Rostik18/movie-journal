import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { DeleteButtonComponent } from '../delete-button/delete-button.component';

@Component({
    selector: 'app-grid-card',
    standalone: true,
    imports: [CommonModule, DeleteButtonComponent],
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

    showDelete = input<boolean>(false);
    deleteAction = input<() => Observable<any>>();

    deleted = output<void>();
}