using MovieJournalBackend.Contracts.Actor;
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
            actor.BirthDate,
            actor.Biography,
            actor.PhotoUrl,
            actor.Visibility);

        public static MediaResponse ToResponse(this Entities.Media.Media media) => new(
            media.Id!,
            media.Title,
            media.OriginalTitle,
            media.Type,
            media.ReleaseYear,
            media.PosterUrl,
            media.Genres,
            media.Tags);

        public static MediaCollectionResponse ToResponse(this Entities.Media.MediaCollection collection) => new(
            collection.Id,
            collection.Name,
            collection.PosterUrl,
            collection.Tags,
            collection.Visibility);

        public static UserResponse ToResponse(this Entities.User.User user) => new(
            user.Id!,
            user.Login,
            user.DisplayName,
            user.Roles,
            user.CreatedAtUtc);

        public static UserWatchingResponse ToResponse(this Entities.Journal.UserWatching entity) => new()
        {
            MediaId = entity.MediaId,
            Title = entity.Title,
            Type = entity.Type,
            Status = entity.Status,
            StoppedAtSeconds = entity.StoppedAtSeconds,
            Rating = entity.Rating,
            Notes = entity.Notes,
            StartedAtUtc = entity.StartedAtUtc,
            FinishedAtUtc = entity.FinishedAtUtc,
            CurrentSeasonNumber = entity.CurrentSeasonNumber,
            CurrentEpisodeNumber = entity.CurrentEpisodeNumber
        };

    }
}
