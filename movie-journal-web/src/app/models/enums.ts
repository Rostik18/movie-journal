export enum MediaLinkType {
    Streaming = "Streaming",
    Trailer = "Trailer",
    OfficialWebsite = "OfficialWebsite",
    Purchase = "Purchase",
    Other = "Other"
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
    User = "User",
    Admin = "Admin"
}

export const UserRoleLabels: Record<UserRole, string> = {
    [UserRole.User]: 'Користувач',
    [UserRole.Admin]: 'Адміністратор'
};

// 4. Видимість
export enum Visibility {
    Public = "Public",
    Private = "Private"
}

export const VisibilityLabels: Record<Visibility, string> = {
    [Visibility.Public]: 'Публічний',
    [Visibility.Private]: 'Приватний'
};

export enum WatchStatus {
    Wishlist = "Wishlist",
    Watching = "Watching",
    Watched = "Watched",
    Dropped = "Dropped"
}

export const WatchStatusLabels: Record<WatchStatus, string> = {
    [WatchStatus.Wishlist]: 'У планах',
    [WatchStatus.Watching]: 'Дивлюся',
    [WatchStatus.Watched]: 'Переглянуто',
    [WatchStatus.Dropped]: 'Покинуто'
};