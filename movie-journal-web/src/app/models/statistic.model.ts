export interface ActorsStatisticResponse {
    totalActors: number;
    maleActors: number;
    femaleActors: number;
    /** ISO alpha-3 код країни → кількість акторів (у актора може бути до 3 громадянств). */
    countByNationality: Record<string, number>;
    /** Початок п'ятирічного вікового блоку ("20" = 20–24 роки) → кількість акторів. */
    countByAge: Record<string, number>;
    /** Номер місяця народження ("1"–"12") → кількість акторів. Місяці без акторів у відповідь не потрапляють. */
    countByMonth: Record<string, number>;
}

export interface MediaStatisticResponse {
    totalMedia: number;

    countByType: Record<string, number>;
    countByYear: Record<string, number>;
    /** Наприклад: "1990", "2000", "2010" */
    countByDecade: Record<string, number>;
    countByGenre: Record<string, number>;
    countByTag: Record<string, number>;

    countWithPoster: number;
    countWithoutPoster: number;
}

export interface UserWatchingStatisticResponse {
    totalMedia: number;

    countByStatus: Record<string, number>;
    countByType: Record<string, number>;
    countByRating: Record<string, number>;
    countByGenre: Record<string, number>;

    averageRating: number | null;
    completionRate: number;
    dropRate: number;

    /** Формат ключа: "yyyy-MM", наприклад "2026-11" */
    countStartedByMonth: Record<string, number>;
    countFinishedByMonth: Record<string, number>;
}