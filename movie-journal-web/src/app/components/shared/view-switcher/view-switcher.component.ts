import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-view-switcher',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './view-switcher.component.html',
    styleUrls: ['./view-switcher.component.scss']
})
export class ViewSwitcherComponent {
    // Отримуємо поточний режим від батьківського компонента (вхідний сигнал)
    currentMode = input<'grid' | 'list'>('grid');

    // Повідомляємо батьківський компонент про зміну режиму (вихідна подія через новий output API)
    modeChange = output<'grid' | 'list'>();

    onSelect(mode: 'grid' | 'list') {
        this.modeChange.emit(mode);
    }
}