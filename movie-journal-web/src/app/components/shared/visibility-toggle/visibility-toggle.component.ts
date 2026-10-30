import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { Visibility, VisibilityLabels } from '../../../models/enums';
import { ToggleGroupComponent, ToggleOption } from '../toggle-group/toggle-group.component';

/** Видимість двома кнопками: глобус (публічний) і замок (приватний). Двосторонній binding: `[(value)]="visibility"`. */
@Component({
    selector: 'app-visibility-toggle',
    standalone: true,
    imports: [ToggleGroupComponent],
    template: `
        <app-toggle-group [options]="options" [value]="value()" ariaLabel="Видимість"
            (valueChange)="onChange($event)" />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisibilityToggleComponent {
    readonly value = model<Visibility>(Visibility.Public);

    readonly options: readonly ToggleOption<Visibility>[] = [
        { value: Visibility.Public, label: VisibilityLabels[Visibility.Public], icon: 'globe' },
        { value: Visibility.Private, label: VisibilityLabels[Visibility.Private], icon: 'lock' }
    ];

    onChange(next: Visibility | null): void {
        if (next !== null) {
            this.value.set(next);
        }
    }
}