import { MediaItem } from '../models/media.model';

/**
 * Одиниця виміру MediaItem.duration, виражена в секундах:
 * 60 = хвилини (як runtimeMinutes у формі створення), 1 = секунди.
 */
const DURATION_UNIT_IN_SECONDS = 60;

/** «Оригінальна назва (рік)»: рік необов'язковий, тож зайвих дужок і пробілів не буде. */
export function formatSubtitle(media: Pick<MediaItem, 'originalTitle' | 'releaseYear'>): string {
    const year = media.releaseYear ? `(${media.releaseYear})` : '';
    return [media.originalTitle, year].filter(Boolean).join(' ');
}

/** 135 хв -> «2 год 15 хв», 45 хв -> «45 хв». Порожній рядок, якщо тривалості немає. */
export function formatDuration(duration: number | null | undefined): string {
    if (!duration || duration <= 0) {
        return '';
    }

    const totalMinutes = Math.max(1, Math.round((duration * DURATION_UNIT_IN_SECONDS) / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${minutes} хв`;
    }
    return minutes === 0 ? `${hours} год` : `${hours} год ${minutes} хв`;
}

/** 3725 секунд -> «1:02:05», 125 секунд -> «2:05». Порожній рядок для null / від'ємних значень. */
export function formatTimecode(totalSeconds: number | null | undefined): string {
    if (totalSeconds == null || totalSeconds < 0) {
        return '';
    }

    const seconds = Math.floor(totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}