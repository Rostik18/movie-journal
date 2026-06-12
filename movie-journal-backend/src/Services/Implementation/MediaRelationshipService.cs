using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public class MediaRelationshipService(
        IMediaRepository _mediaRepository,
        IMediaCollectionRepository _collectionRepository,
        IActorRepository _actorRepository,
        IRealtimeService _realtimeService
        ) : IMediaRelationshipService
    {
        public async Task<Media> AddActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanEdit(media);

            var actor = await _actorRepository.GetByIdAsync(actorId, user, ct)
                ?? throw new NotFoundException("Actor not found.");

            user.EnsureCanRead(actor);

            if (media.Visibility == Visibility.Public && actor.Visibility == Visibility.Private)
            {
                throw new ValidationException("Public media cannot contain private actors.");
            }

            if (media.Cast.Any(x => x.ActorId == actorId))
            {
                return media;
            }

            media.Cast.Add(new()
            {
                ActorId = actor.Id,
                FullName = actor.FullName
            });

            media.LastModifiedByUserId = user.UserId;

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media;
        }

        public async Task<Media> RemoveActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanEdit(media);

            var actor = await _actorRepository.GetByIdAsync(actorId, user, ct)
                ?? throw new NotFoundException("Actor not found.");

            user.EnsureCanRead(actor);

            var count = media.Cast.RemoveAll(x => x.ActorId == actorId);

            if (count > 0)
            {
                await _mediaRepository.UpdateAsync(media, ct);

                await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);
            }

            return media;
        }

        public async Task<Media> AddToCollectionAsync(string mediaId, string collectionId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanEdit(media);

            var collection = await _collectionRepository.GetByIdAsync(collectionId, user, ct)
                ?? throw new NotFoundException("Collection not found.");

            user.EnsureCanRead(collection);

            if (collection.Visibility == Visibility.Public && media.Visibility == Visibility.Private)
            {
                throw new ValidationException("Public collection cannot contain private media.");
            }

            media.Collection = new()
            {
                Id = collection.Id,
                Name = collection.Name
            };

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media;
        }

        public async Task<Media> RemoveFromCollectionAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanEdit(media);

            if (media.Collection is null)
            {
                return media;
            }

            media.Collection = null;

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media;
        }
    }
}
