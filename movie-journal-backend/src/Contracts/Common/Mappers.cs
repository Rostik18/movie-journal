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
            actor.Visibility,
            actor.Sex);

        public static MediaResponse ToResponse(this Entities.Media.Media media, List<Entities.Actor.Actor> actors) => new(
            media.Id!,
            media.Title,
            media.Description,
            media.OriginalTitle,
            media.Type,
            media.ReleaseYear,
            media.DurationSec,
            media.PosterUrl,
            media.Author,
            media.Genres,
            media.Tags,
            media.Links,
            [.. media.Cast.Select(cast => new CastResponse(cast.ActorId, cast.FullName, actors.First(x => x.Id == cast.ActorId).PhotoUrl, cast.CharacterName))],
            media.Visibility);

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

        public static UserWatchingResponse ToResponse(this Entities.Journal.UserWatching entity, MediaResponse media) => new()
        {
            Media = media,
            Status = entity.Status,
            StoppedAtSeconds = entity.StoppedAtSeconds,
            Rating = entity.Rating,
            Notes = entity.Notes,
            StartedAtUtc = entity.StartedAtUtc,
            FinishedAtUtc = entity.FinishedAtUtc,
            CurrentSeasonNumber = entity.CurrentSeasonNumber,
            CurrentEpisodeNumber = entity.CurrentEpisodeNumber
        };

        public static UserWatchingResponseSlim ToResponseSlim(this Entities.Journal.UserWatching entity, MediaResponseSlim media) => new()
        {
            Media = media,
            Status = entity.Status,
            Rating = entity.Rating,
            Notes = entity.Notes,
        };
    }
}
