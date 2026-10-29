import { ChangeDetectionStrategy, Component, input, linkedSignal, output, signal } from '@angular/core';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
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
  styleUrls: ['./rating-stars.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RatingStarsComponent {
  // Початкове (або серверне) значення. При зміні входу оцінка синхронізується з ним.
  readonly initialRating = input<number | null>(null);

  // Подія, яку слухатиме батьківський компонент
  readonly ratingChange = output<number>();

  readonly stars = Array.from({ length: 10 }, (_, i) => i + 1);

  /**
   * Залежить від initialRating: раніше значення читалось один раз в ngOnInit,
   * тому зміна входу (наприклад, відкат після помилки збереження або скидання форми)
   * не оновлювала зірки. Клік користувача перезаписує значення до наступної зміни входу.
   */
  readonly currentRating = linkedSignal(() => this.initialRating() ?? 0);
  readonly hoverRating = signal(0);

  onMouseEnter(star: number): void {
    this.hoverRating.set(star);
  }

  onMouseLeave(): void {
    this.hoverRating.set(0);
  }

  selectRating(star: number): void {
    this.currentRating.set(star);
    this.ratingChange.emit(star); // Передаємо число від 1 до 10 нагору
  }
}