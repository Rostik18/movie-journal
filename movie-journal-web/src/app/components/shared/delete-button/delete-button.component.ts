import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-delete-button',
    standalone: true,
    imports: [CommonModule],
    template: `
    <button 
      type="button" 
      class="btn-delete-icon" 
      [disabled]="isDeleting()"
      (click)="onClick($event)" 
      title="Видалити">
      @if (!isDeleting()) {
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      } @else {
        <span class="spinner">⏳</span>
      }
    </button>
  `,
    styleUrls: ['./delete-button.component.scss']
})
export class DeleteButtonComponent {
    deleteAction = input.required<() => Observable<any>>();
    deleted = output<void>();
    isDeleting = signal(false);

    onClick(event: MouseEvent) {
        event.stopPropagation();

        if (!confirm('Ви впевнені, що хочете видалити цей об’єкт?')) {
            return;
        }

        this.isDeleting.set(true);

        this.deleteAction()().subscribe({
            next: () => {
                this.isDeleting.set(false);
                this.deleted.emit();
            },
            error: (err) => {
                console.error('Помилка видалення:', err);
                this.isDeleting.set(false);
            }
        });
    }
}