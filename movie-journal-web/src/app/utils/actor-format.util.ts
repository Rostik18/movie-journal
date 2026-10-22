/**
 * Повних років на сьогодні. Дата народження приходить як UTC-момент (півночі за UTC),
 * тому береться її UTC-день, а порівнюється з календарним днем користувача.
 * Невалідна або майбутня дата -> null.
 */
export function calculateAge(birthDate: string | null | undefined, today: Date = new Date()): number | null {
    if (!birthDate) {
        return null;
    }

    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) {
        return null;
    }

    let age = today.getFullYear() - birth.getUTCFullYear();
    const monthDiff = today.getMonth() - birth.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
        age--;
    }

    return age >= 0 ? age : null;
}

/** «21 рік», «22 роки», «25 років» (11–14 — завжди «років»). */
export function formatAge(birthDate: string | null | undefined, today: Date = new Date()): string {
    const age = calculateAge(birthDate, today);
    if (age === null) {
        return '';
    }

    const lastTwo = age % 100;
    const last = age % 10;

    let unit = 'років';
    if (lastTwo < 11 || lastTwo > 14) {
        if (last === 1) {
            unit = 'рік';
        } else if (last >= 2 && last <= 4) {
            unit = 'роки';
        }
    }

    return `${age} ${unit}`;
}