
export interface ActorsStatisticResponse {
    TotalActors: number;
    MaleActors: number;
    FemaleActors: number;
    CountByNationality: Record<string, number>;
    CountByAge: Record<string, number>;
}
