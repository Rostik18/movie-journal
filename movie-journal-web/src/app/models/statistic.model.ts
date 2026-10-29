export interface ActorsStatisticResponse {
    totalActors: number;
    maleActors: number;
    femaleActors: number;
    /** ISO alpha-3 код країни → кількість акторів (у актора може бути до 3 громадянств). */
    countByNationality: Record<string, number>;
    /** Початок п'ятирічного вікового блоку ("20" = 20–24 роки) → кількість акторів. */
    countByAge: Record<string, number>;
}