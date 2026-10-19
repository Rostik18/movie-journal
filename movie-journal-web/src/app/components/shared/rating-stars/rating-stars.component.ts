import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-rating-stars',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="rating-stars-container">
      @for (star of stars; track star) {
        <span 
          class="star" 
          [class.active]="star <= (hoverRating() || currentRating())"
          (mouseenter)="onMouseEnter(star)"
          (mouseleave)="onMouseLeave()"
          (click)="selectRating(star)">
          ★
        </span>
      }
      @if (currentRating() > 0) {
        <span class="rating-value">({{ currentRating() }}/10)</span>
      }
    </div>
  `,
    styleUrls: ['./rating-stars.component.scss']
})
export class RatingStarsComponent {
    // Дозволяємо передати початкове значення (опціонально)
    initialRating = input<number | null>(null);

    // Подія, яку слухатиме батьківський компонент
    ratingChange = output<number>();

    stars = Array.from({ length: 10 }, (_, i) => i + 1);

    currentRating = signal<number>(0);
    hoverRating = signal<number>(0);

    ngOnInit() {
        if (this.initialRating()) {
            this.currentRating.set(this.initialRating()!);
        }
    }

    onMouseEnter(star: number) {
        this.hoverRating.set(star);
    }

    onMouseLeave() {
        this.hoverRating.set(0);
    }

    selectRating(star: number) {
        this.currentRating.set(star);
        this.ratingChange.emit(star); // Передаємо число від 1 до 10 нагору
    }
}