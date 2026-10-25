using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Base;
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
        public async Task<MediaResponse> AddActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default)
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

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            if (media.Visibility == Visibility.Public && actors.Any(x => x.Visibility == Visibility.Private))
            {
                throw new ValidationException("Public media cannot contain private actors.");
            }

            if (media.Cast.Any(x => x.ActorId == actorId))
            {
                return media.ToResponse(actors);
            }

            media.Cast.Add(new()
            {
                ActorId = actor.Id,
                FullName = actor.FullName
            });

            media.LastModifiedByUserId = user.UserId;

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media.ToResponse(actors);
        }

        public async Task<MediaResponse> RemoveActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanEdit(media);

            var actor = await _actorRepository.GetByIdAsync(actorId, user, ct)
                ?? throw new NotFoundException("Actor not found.");

            user.EnsureCanRead(actor);

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            if (media.Visibility == Visibility.Public && actors.Any(x => x.Visibility == Visibility.Private))
            {
                throw new ValidationException("Public media cannot contain private actors.");
            }

            var count = media.Cast.RemoveAll(x => x.ActorId == actorId);

            if (count > 0)
            {
                await _mediaRepository.UpdateAsync(media, ct);

                await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);
            }

            return media.ToResponse(actors);
        }

        public async Task<MediaResponse> AddToCollectionAsync(string mediaId, string collectionId, UserContext user, CancellationToken ct = default)
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

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media.ToResponse(actors);
        }

        public async Task<MediaResponse> RemoveFromCollectionAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var media = await _mediaRepository.GetByIdAsync(mediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanEdit(media);

            var actors = await _actorRepository.GetByIdsAsync([.. media.Cast.Select(x => x.ActorId)], ct);

            if (media.Collection is null)
            {
                return media.ToResponse(actors);
            }

            media.Collection = null;

            await _mediaRepository.UpdateAsync(media, ct);

            await _realtimeService.PublishAsync(media.OwnerUserId, media.Visibility, ResourceType.Media, EventType.Updated, media.Id);

            return media.ToResponse(actors);
        }
    }
}
