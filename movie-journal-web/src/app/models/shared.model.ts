
export interface PageResponse<T> {
    items: T[];
    offset: number;
    size: number;
    totalCount: number;
}