using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class MediaCollectionService(
        IMediaCollectionRepository _collectionRepository,
        IMediaRepository _mediaRepository,
        IRealtimeService _realtimeService
        ) : IMediaCollectionService
    {
        public Task<MediaCollection?> GetByIdAsync(string collectionId, UserContext user, CancellationToken ct = default)
        {
            return _collectionRepository.GetByIdAsync(collectionId, user, ct);
        }

        public Task<Page<MediaCollection>> SearchAsync(SearchRequest<MediaCollectionFilter, MediaCollectionSortField> request, UserContext user, CancellationToken ct = default)
        {
            return _collectionRepository.SearchAsync(request, user, ct);
        }

        public async Task<MediaCollection> CreateAsync(CreateMediaCollectionRequest request, UserContext user, CancellationToken ct = default)
        {
            if (await _collectionRepository.ExistsAsync(request.Name, user, ct))
            {
                throw new ValidationException($"Collection '{request.Name}' already exists.");
            }

            var collection = new MediaCollection
            {
                Name = request.Name,
                PosterUrl = request.PosterUrl,
                Tags = request.Tags ?? [],
                Visibility = request.Visibility,
                OwnerUserId = user.UserId,
                CreatedByUserId = user.UserId,
            };

            await _collectionRepository.CreateAsync(collection, ct);

            await _realtimeService.PublishAsync(user.UserId, collection.Visibility, ResourceType.Collection, EventType.Created, collection.Id);

            return collection;
        }

        public async Task<MediaCollection> UpdateAsync(UpdateMediaCollectionRequest request, UserContext user, CancellationToken ct = default)
        {
            var collection = await _collectionRepository.GetByIdAsync(request.CollectionId, user, ct)
                ?? throw new ApplicationException($"Collection '{request.CollectionId}' not found.");

            user.EnsureCanEdit(collection);

            if (request.Name is not null)
            {
                collection.Name = request.Name;
            }
            if (request.PosterUrl is not null)
            {
                collection.PosterUrl = request.PosterUrl;
            }
            if (request.Tags is not null)
            {
                collection.Tags = request.Tags;
            }
            if (request.Visibility.HasValue)
            {
                var hasPrivateMedia = await _mediaRepository.HasPrivateMediaInCollectionAsync(collection.Id, ct);

                if (hasPrivateMedia)
                {
                    throw new ValidationException("Collection contains private media.");
                }

                collection.Visibility = request.Visibility.Value;
            }

            collection.LastModifiedByUserId = user.UserId;

            await _collectionRepository.UpdateAsync(collection, ct);

            await _realtimeService.PublishAsync(user.UserId, collection.Visibility, ResourceType.Collection, EventType.Updated, collection.Id);

            return collection;
        }

        public async Task DeleteAsync(string collectionId, UserContext user, CancellationToken ct = default)
        {
            if (!user.IsAdmin)
            {
                throw new ApplicationException("Only admins can delete collections.");
            }

            var collection = await _collectionRepository.GetByIdAsync(collectionId, user, ct);

            if (collection is null)
            {
                return;
            }

            await _mediaRepository.ResetCollectionAsync(collectionId, ct);

            await _collectionRepository.DeleteAsync(collectionId, ct);

            await _realtimeService.PublishAsync(user.UserId, collection.Visibility, ResourceType.Collection, EventType.Deleted, collection.Id);
        }
    }
}
