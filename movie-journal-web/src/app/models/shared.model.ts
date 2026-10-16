
export enum SortDirection {
    Ascending = 'Ascending',
    Descending = 'Descending'
}

export interface PageResponse<T> {
    items: T[];
    offset: number;
    size: number;
    totalCount: number;
}