using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
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
        IRealtimeService _realtimeService
    ) : IMediaService
    {
        public async Task<Media?> GetByIdAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct);

            if (media is null)
            {
                return null;
            }

            return media;
        }

        public Task<Page<Media>> SearchAsync(SearchRequest<MediaFilter, MediaSortField> request, UserContext user, CancellationToken ct = default)
        {
            return _mediaRepository.SearchAsync(request, user, ct);
        }

        public async Task<Media> CreateAsync(CreateMediaRequest request, UserContext user, CancellationToken ct = default)
        {
            if (await _mediaRepository.ExistsAsync(request.Title, user, ct))
            {
                throw new ValidationException($"Media '{request.Title}' already exists.");
            }

            CollectionReference? collection = null;

            if (!string.IsNullOrWhiteSpace(request.CollectionId))
            {
                var existingCollection = await _collectionRepository.GetByIdAsync(request.CollectionId, user, ct)
                    ?? throw new InvalidOperationException($"Collection '{request.CollectionId}' not found.");

                if (existingCollection.Visibility == Visibility.Public && request.Visibility == Visibility.Private)
                {
                    throw new ValidationException("Private media cannot belong to a public collection.");
                }

                collection = new CollectionReference
                {
                    Id = existingCollection.Id!,
                    Name = existingCollection.Name
                };
            }

            var media = new Media
            {
                Title = request.Title,
                NormalizedTitle = Helpers.Normalize(request.Title),
                OriginalTitle = request.OriginalTitle,
                Type = request.Type,
                ReleaseYear = request.ReleaseYear,
                RuntimeMinutes = request.RuntimeMinutes,
                PosterUrl = request.PosterUrl,
                Visibility = request.Visibility,

                Genres = request.Genres,
                Tags = request.Tags,
                Cast = request.Cast,
                Links = request.Links,
                Seasons = request.Seasons,

                Collection = collection,

                OwnerUserId = user.UserId,
                CreatedByUserId = user.UserId
            };

            var actorIds = media.Cast.Select(x => x.ActorId).ToList();

            var hasPrivateActors = await _actorRepository.HasPrivateActorsAsync(actorIds, ct);

            if (hasPrivateActors)
            {
                throw new ValidationException("Public media cannot contain private actors.");
            }

            await _mediaRepository.CreateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Created, media.Id);

            return media;
        }

        public async Task<Media> UpdateAsync(UpdateMediaRequest request, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(request.MediaId, user, ct)
                ?? throw new InvalidOperationException($"Media '{request.MediaId}' not found.");

            user.EnsureCanEdit(media);

            if (request.Title is not null)
            {
                media.Title = request.Title;
                media.NormalizedTitle = Helpers.Normalize(request.Title);
            }
            if (request.OriginalTitle is not null)
            {
                media.OriginalTitle = request.OriginalTitle;
            }
            if (request.ReleaseYear.HasValue)
            {
                media.ReleaseYear = request.ReleaseYear.Value;
            }
            if (request.RuntimeMinutes.HasValue)
            {
                media.RuntimeMinutes = request.RuntimeMinutes.Value;
            }
            if (request.PosterUrl is not null)
            {
                media.PosterUrl = request.PosterUrl;
            }
            if (request.Visibility.HasValue)
            {
                var actorIds = media.Cast.Select(x => x.ActorId).ToList();

                var hasPrivateActors = await _actorRepository.HasPrivateActorsAsync(actorIds, ct);

                if (hasPrivateActors)
                {
                    throw new ValidationException("Public media cannot contain private actors.");
                }

                media.Visibility = request.Visibility.Value;
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
            if (request.CollectionId is not null)
            {
                if (string.IsNullOrWhiteSpace(request.CollectionId))
                {
                    media.Collection = null;
                }
                else
                {
                    var collection = await _collectionRepository.GetByIdAsync(request.CollectionId, user, ct)
                        ?? throw new InvalidOperationException($"Collection '{request.CollectionId}' not found.");

                    if (collection.Visibility == Visibility.Public && request.Visibility == Visibility.Private)
                    {
                        throw new ValidationException("Private media cannot belong to a public collection.");
                    }

                    media.Collection = new()
                    {
                        Id = collection.Id,
                        Name = collection.Name
                    };
                }
            }

            media.LastModifiedByUserId = user.UserId;

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media;
        }

        public async Task DeleteAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            if (!user.IsAdmin)
            {
                throw new UnauthorizedAccessException("Only admins can delete media.");
            }

            var media = await _mediaRepository.GetByIdAsync(mediaId, ct);

            if (media is null)
            {
                return;
            }

            await _mediaRepository.DeleteAsync(mediaId, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Deleted, media.Id);
        }
    }
}
