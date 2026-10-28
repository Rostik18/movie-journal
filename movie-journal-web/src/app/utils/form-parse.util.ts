/** «a, b, , a» → ['a', 'b'] (без порожніх і дублікатів). */
export const parseCommaList = (value: string): string[] =>
    [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];

/** Чи є рядок абсолютним http(s)-посиланням. */
export const isHttpUrl = (value: string): boolean => {
    try {
        const { protocol } = new URL(value);
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
};