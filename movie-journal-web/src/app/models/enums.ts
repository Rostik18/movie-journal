export enum MediaLinkType {
    Streaming = 1,
    Trailer = 2,
    OfficialWebsite = 3,
    Purchase = 4,
    Other = 5
}

export const MediaLinkTypeLabels: Record<MediaLinkType, string> = {
    [MediaLinkType.Streaming]: 'Стрімінг',
    [MediaLinkType.Trailer]: 'Трейлер',
    [MediaLinkType.OfficialWebsite]: 'Офіційний сайт',
    [MediaLinkType.Purchase]: 'Покупка',
    [MediaLinkType.Other]: 'Інше'
};

// 2. Типи медіаконтенту
export enum MediaType {
    Movie = "Movie",
    Series = "Series",
    Animation = "Animation",
    Anime = "Anime",
    Documentary = "Documentary",
    ShortFilm = "ShortFilm",
    Video = "Video"
}

export const MediaTypeLabels: Record<MediaType, string> = {
    [MediaType.Movie]: 'Фільм',
    [MediaType.Series]: 'Серіал',
    [MediaType.Animation]: 'Анімація',
    [MediaType.Anime]: 'Аніме',
    [MediaType.Documentary]: 'Документальний',
    [MediaType.ShortFilm]: 'Короткометражка',
    [MediaType.Video]: 'Відео'
};

// 3. Ролі користувачів
export enum UserRole {
    User = 1,
    Admin = 2
}

export const UserRoleLabels: Record<UserRole, string> = {
    [UserRole.User]: 'Користувач',
    [UserRole.Admin]: 'Адміністратор'
};

// 4. Видимість
export enum Visibility {
    Public = 1,
    Private = 2
}

export const VisibilityLabels: Record<Visibility, string> = {
    [Visibility.Public]: 'Публічний',
    [Visibility.Private]: 'Приватний'
};

export enum WatchStatus {
    Wishlist = 0,
    Watching = 1,
    Watched = 2,
    Dropped = 3
}

export const WatchStatusLabels: Record<WatchStatus, string> = {
    [WatchStatus.Wishlist]: 'У планах',
    [WatchStatus.Watching]: 'Дивлюся',
    [WatchStatus.Watched]: 'Переглянуто',
    [WatchStatus.Dropped]: 'Покинуто'
};