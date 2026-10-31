export enum MediaType {
    Movie = "Movie",
    SeriesEpisode = "SeriesEpisode",
    Animation = "Animation",
    Anime = "Anime",
    Documentary = "Documentary",
    ShortFilm = "ShortFilm",
    Video = "Video"
}

export const MediaTypeLabels: Record<MediaType, string> = {
    [MediaType.Movie]: 'Фільм',
    [MediaType.SeriesEpisode]: 'Епізод серіалу',
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

export enum Sex {
    Male = 'Male',
    Female = 'Female'
}

export const SexLabels: Record<Sex, string> = {
    [Sex.Male]: 'Чоловік',
    [Sex.Female]: 'Жінка'
};