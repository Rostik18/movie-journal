using MovieJournalBackend.Contracts.Actor;
using MovieJournalBackend.Contracts.Creator;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Contracts.User;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Contracts.Common
{
    public static class Mappers
    {
        public static Page<TResult> ToResponse<TSource, TResult>(this Page<TSource> page, Func<TSource, TResult> map) => new(
            [.. page.Items.Select(map)],
            page.Offset,
            page.Size,
            page.TotalCount);

        public static ActorResponse ToResponse(this Entities.Actor.Actor actor) => new(
            actor.Id,
            actor.FullName,
            actor.Alias,
            actor.BirthDate,
            actor.Biography,
            actor.PhotoUrl,
            actor.Visibility,
            actor.Sex,
            actor.Nationalities);

        public static MediaResponse ToResponse(this Entities.Media.Media media) => new(
            media.Id!,
            media.Title,
            media.Description,
            media.OriginalTitle,
            media.Type,
            media.ReleaseYear,
            media.DurationSec,
            media.PosterUrl,
            media.Creator,
            media.Genres,
            media.Tags,
            media.Links,
            media.Cast,
            media.Visibility,
            media.Collection
            );

        public static MediaResponseSlim ToResponseSlim(this Entities.Media.Media media) => new(
            media.Id!,
            media.Title,
            media.Type,
            media.ReleaseYear,
            media.DurationSec,
            media.PosterUrl,
            media.Genres,
            media.Links,
            media.Visibility);

        public static MediaCollectionResponse ToResponse(this Entities.Media.MediaCollection collection) => new(
            collection.Id,
            collection.Name,
            collection.Description,
            collection.PosterUrl,
            collection.Tags,
            collection.Visibility);

        public static UserResponse ToResponse(this Entities.User.User user) => new(
            user.Id!,
            user.Login,
            user.DisplayName,
            user.Roles,
            user.CreatedAtUtc);

        public static UserWatchingResponse ToResponse(this Entities.Journal.UserWatching entity, MediaResponse media) => new(
            media,
            entity.Status,
            entity.StoppedAtSeconds,
            entity.Rating,
            entity.Notes,
            entity.StartedAtUtc,
            entity.FinishedAtUtc,
            entity.CurrentSeasonNumber,
            entity.CurrentEpisodeNumber
            );

        public static UserWatchingResponseSlim ToResponseSlim(this Entities.Journal.UserWatching entity, MediaResponseSlim media) => new(
            media,
            entity.Status,
            entity.Rating,
            entity.Notes
            );

        public static CreatorResponse ToResponse(this Entities.Creator.Creator entity) => new(
            entity.Id,
            entity.Name,
            entity.Description,
            entity.ImageUrl,
            entity.WebsiteUrl,
            entity.Visibility
            );

        public static ActorResponseSb ToResponseSb(this Entities.Actor.Actor actor, List<MediaResponseSlim> medias) => new(
            actor.Id,
            actor.FullName,
            actor.Alias,
            actor.BirthDate,
            actor.Biography,
            actor.PhotoUrl,
            actor.Visibility,
            actor.Sex,
            actor.Nationalities,
            medias);

        public static MediaResponseSb ToResponseSb(this Entities.Media.Media media, List<CastResponse> actors, MediaCollectionResponse? collection) => new(
            media.Id!,
            media.Title,
            media.Description,
            media.OriginalTitle,
            media.Type,
            media.ReleaseYear,
            media.DurationSec,
            media.PosterUrl,
            media.Creator,
            media.Genres,
            media.Tags,
            media.Links,
            actors,
            media.Visibility,
            collection
            );

        public static MediaCollectionResponseSb ToResponseSb(this Entities.Media.MediaCollection collection, List<MediaResponseSlim> media) => new(
            collection.Id,
            collection.Name,
            collection.Description,
            collection.PosterUrl,
            collection.Tags,
            collection.Visibility,
            media
            );

        public static UserWatchingResponseSb ToResponseSb(this Entities.Journal.UserWatching entity, MediaResponseSb media) => new(
            media,
            entity.Status,
            entity.StoppedAtSeconds,
            entity.Rating,
            entity.Notes,
            entity.StartedAtUtc,
            entity.FinishedAtUtc,
            entity.CurrentSeasonNumber,
            entity.CurrentEpisodeNumber
            );

        public static CreatorResponseSb ToResponseSb(this Entities.Creator.Creator entity, List<MediaResponseSlim> medias) => new(
            entity.Id,
            entity.Name,
            entity.Description,
            entity.ImageUrl,
            entity.WebsiteUrl,
            entity.Visibility,
            medias
            );
    }
}
