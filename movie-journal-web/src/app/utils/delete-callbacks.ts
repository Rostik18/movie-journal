import { Observable } from 'rxjs';

export type DeleteCallback<TResult = unknown> = () => Observable<TResult>;

export interface DeleteCallbacks<TId, TResult> {
    /** Той самий колбек для того самого id: у шаблоні не створюється нова функція на кожен цикл change detection. */
    get(id: TId): DeleteCallback<TResult>;
    /** Прибирає колбек із кешу після видалення. */
    forget(id: TId): void;
}

/** Кеш колбеків видалення за id (див. DetailsSidebarComponent.deleteAction). */
export function createDeleteCallbacks<TId, TResult>(
    remove: (id: TId) => Observable<TResult>
): DeleteCallbacks<TId, TResult> {
    const cache = new Map<TId, DeleteCallback<TResult>>();

    return {
        get(id) {
            let callback = cache.get(id);
            if (!callback) {
                callback = () => remove(id);
                cache.set(id, callback);
            }
            return callback;
        },
        forget(id) {
            cache.delete(id);
        }
    };
}