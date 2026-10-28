import { Component, input, output } from '@angular/core';

@Component({
    selector: 'app-view-switcher',
    standalone: true,
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