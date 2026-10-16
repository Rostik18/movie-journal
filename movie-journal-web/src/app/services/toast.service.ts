import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'success' | 'error' | 'info';
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    // Використовуємо Signal для зберігання списку активних тостів
    toasts = signal<ToastMessage[]>([]);
    private counter = 0;

    // Показати повідомлення (успіх, помилка, інфо)
    show(text: string, type: 'success' | 'error' | 'info' = 'success', durationMs: number = 3500) {
        const id = ++this.counter;
        const newToast: ToastMessage = { id, text, type };

        // Додаємо новий тост у список
        this.toasts.update(current => [...current, newToast]);

        // Автоматично видаляємо через заданий час
        setTimeout(() => {
            this.remove(id);
        }, durationMs);
    }

    remove(id: number) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}