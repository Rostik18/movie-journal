using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class MediaService(
        IMediaRepository _mediaRepository,
        IMediaCollectionRepository _collectionRepository,
        IActorRepository _actorRepository,
        ICreatorRepository _creatorRepository,
        IRealtimeService _realtimeService
    ) : IMediaService
    {
        public Task<Media?> GetByIdAsync(string mediaId, UserContext user, CancellationToken ct = default) =>
            _mediaRepository.GetByIdAsync(mediaId, user, ct);

        public async Task<MediaResponseSb?> GetByIdSbAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct);

            if (media is null) return null;

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            var cast = MapCast(media, actors);

            var collection = media.Collection is null
                ? null
                : await _collectionRepository.GetByIdAsync(media.Collection.Id, ct);

            return media.ToResponseSb(cast, collection?.ToResponse());
        }

        public Task<Page<Media>> SearchAsync(SearchRequest<MediaFilter, MediaSortField> request, UserContext user, CancellationToken ct = default)
        {
            return _mediaRepository.SearchAsync(request, user, ct);
        }

        public async Task<MediaResponse> CreateAsync(CreateMediaRequest request, UserContext user, CancellationToken ct = default)
        {
            if (await _mediaRepository.ExistsAsync(request.Title, user, ct))
            {
                throw new ValidationException($"Media '{request.Title}' already exists.");
            }

            var media = new Media
            {
                Title = request.Title,
                Description = request.Description,
                NormalizedTitle = Helpers.Normalize(request.Title),
                OriginalTitle = request.OriginalTitle,
                Type = request.Type,
                ReleaseYear = request.ReleaseYear,
                DurationSec = request.Duration,
                PosterUrl = request.PosterUrl,
                Genres = request.Genres,
                Tags = request.Tags,
                Cast = request.Cast,
                Links = request.Links,
                Seasons = request.Seasons,
                Visibility = request.Visibility,
                Creator = request.CreatorId is null
                    ? null
                    : await GetCreator(request.Visibility, request.CreatorId, ct),
                Collection = request.CollectionId is null
                    ? null
                    : await GetCollection(request.Visibility, request.CollectionId, user, ct),

                OwnerUserId = user.UserId,
                CreatedByUserId = user.UserId
            };

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            if (request.Visibility == Visibility.Public && actors.Any(x => x.Visibility == Visibility.Private))
            {
                throw new ValidationException("Public media cannot contain private actors.");
            }

            await _mediaRepository.CreateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Created, media.Id);

            return media.ToResponse();
        }

        public async Task<MediaResponse> UpdateAsync(UpdateMediaRequest request, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(request.MediaId, user, ct)
                ?? throw new InvalidOperationException($"Media '{request.MediaId}' not found.");

            user.EnsureCanEdit(media);

            if (request.Title is not null)
            {
                media.Title = request.Title;
                media.NormalizedTitle = Helpers.Normalize(request.Title);
            }
            if (request.Description is not null)
            {
                media.Description = request.Description;
            }
            if (request.OriginalTitle is not null)
            {
                media.OriginalTitle = request.OriginalTitle;
            }
            if (request.Type.HasValue)
            {
                media.Type = request.Type.Value;
            }
            if (request.ReleaseYear.HasValue)
            {
                media.ReleaseYear = request.ReleaseYear.Value;
            }
            if (request.Duration.HasValue)
            {
                media.DurationSec = request.Duration.Value;
            }
            if (request.PosterUrl is not null)
            {
                media.PosterUrl = request.PosterUrl;
            }
            if (request.Genres is not null)
            {
                media.Genres = request.Genres;
            }
            if (request.Tags is not null)
            {
                media.Tags = request.Tags;
            }
            if (request.Cast is not null)
            {
                media.Cast = request.Cast;
            }
            if (request.Links is not null)
            {
                media.Links = request.Links;
            }
            if (request.Seasons is not null)
            {
                media.Seasons = request.Seasons;
            }
            if (request.Visibility.HasValue)
            {
                var actorIds = media.Cast.Select(x => x.ActorId).ToList();

                var hasPrivateActors = await _actorRepository.HasPrivateActorsAsync(actorIds, ct);

                if (request.Visibility == Visibility.Public && hasPrivateActors)
                {
                    throw new ValidationException("Public media cannot contain private actors.");
                }

                media.Visibility = request.Visibility.Value;
            }
            if (request.CreatorId is not null)
            {
                media.Creator = await GetCreator(media.Visibility, request.CreatorId, ct);
            }
            if (request.CollectionId is not null)
            {
                media.Collection = await GetCollection(media.Visibility, request.CollectionId, user, ct);
            }

            media.LastModifiedByUserId = user.UserId;

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            if (media.Visibility == Visibility.Public && actors.Any(x => x.Visibility == Visibility.Private))
            {
                throw new ValidationException("Public media cannot contain private actors.");
            }

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media.ToResponse();
        }

        public async Task DeleteAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new InvalidOperationException($"Media '{mediaId}' not found.");

            user.EnsureCanDelete(media);

            await _mediaRepository.DeleteAsync(mediaId, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Deleted, media.Id);
        }

        private async Task<MediaCreator> GetCreator(Visibility mediaVisibility, string creatorId, CancellationToken ct)
        {
            var creator = await _creatorRepository.GetByIdAsync(creatorId, ct)
                ?? throw new InvalidOperationException($"Media creator '{creatorId}' not found.");

            if (mediaVisibility == Visibility.Public && creator.Visibility == Visibility.Private)
            {
                throw new ValidationException("Public media cannot contain private creator.");
            }

            return new() { Id = creator.Id, Name = creator.Name };
        }

        private async Task<CollectionReference> GetCollection(Visibility mediaVisibility, string collectionId, UserContext user, CancellationToken ct)
        {
            var collection = await _collectionRepository.GetByIdAsync(collectionId, user, ct)
                ?? throw new InvalidOperationException($"Collection '{collectionId}' not found.");

            if (mediaVisibility == Visibility.Private && collection.Visibility == Visibility.Public)
            {
                throw new ValidationException("Private media cannot belong to a public collection.");
            }

            return new() { Id = collection.Id, Name = collection.Name };
        }

        private static List<CastResponse> MapCast(Media media, List<Actor> actors)
        {
            var cast = new List<CastResponse>(actors.Count);

            foreach (var actor in actors)
            {
                var character = media.Cast.First(x => x.ActorId == actor.Id);

                cast.Add(new(actor.Id, actor.FullName, actor.Alias, actor.PhotoUrl, character.CharacterName));
            }

            return cast;
        }
    }
}
