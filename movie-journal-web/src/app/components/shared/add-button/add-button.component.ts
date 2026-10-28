import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-add-button',
  standalone: true,
  template: `
    <button class="unique-add-btn" (click)="clicked.emit()">
      <span class="plus-icon">+</span>
      <span class="btn-text">{{ label() }}</span>
    </button>
  `,
  styleUrls: ['./add-button.component.scss']
})
export class AddButtonComponent {
  // Сигнальний вхід для тексту кнопки (можна перевикористовувати для фільмів, акторів тощо)
  label = input<string>('Додати');

  // Сигнальний вихід для події кліку
  clicked = output<void>();
}