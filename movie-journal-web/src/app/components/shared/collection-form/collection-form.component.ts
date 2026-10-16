import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Visibility, VisibilityLabels } from '../../../models/enums';
import { CollectionService } from '../../../services/collection.service';
import { ToastService } from '../../../services/toast.service';
import { CreateMediaCollectionRequest } from '../../../models/collection.model';

@Component({
    selector: 'app-collection-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './collection-form.component.html',
    styleUrls: ['./collection-form.component.scss']
})
export class CollectionFormComponent {
    private collectionService = inject(CollectionService);
    private toastService = inject(ToastService);

    collectionCreated = output<void>();

    collectionData: CreateMediaCollectionRequest = {
        name: '',
        description: '',
        posterUrl: '',
        tags: [],
        visibility: Visibility.Public
    };

    tagsInput = '';
    imageError = false;

    visibilityOptions = [
        { value: Visibility.Public, label: VisibilityLabels[Visibility.Public] },
        { value: Visibility.Private, label: VisibilityLabels[Visibility.Private] }
    ];

    onPosterUrlChange() {
        this.imageError = false;
    }

    onSubmit() {
        if (!this.collectionData.name.trim()) {
            this.toastService.show("Будь ласка, введіть назву колекції.", 'error');
            return;
        }

        this.collectionData.tags = this.tagsInput
            ? this.tagsInput.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        this.toastService.show(`Створення колекції "${this.collectionData.name}" запущено у фоні...`, 'info', 4000);

        this.collectionService.createCollection(this.collectionData).subscribe({
            next: () => {
                this.toastService.show(`Колекцію "${this.collectionData.name}" успішно створено! 🎉`, 'success', 5000);
                this.collectionCreated.emit();
            },
            error: (err) => {
                console.error('Помилка створення колекції:', err);
                this.toastService.show(`Не вдалося створити колекцію.`, 'error', 6000);
            }
        });
    }
}