using MovieJournalBackend.Contracts.Actor;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class ActorService(
        IActorRepository _actorRepository,
        IMediaRepository _mediaRepository,
        IRealtimeService _realtimeService
        ) : IActorService
    {
        public Task<Actor?> GetByIdAsync(string actorId, UserContext user, CancellationToken ct = default) =>
            _actorRepository.GetByIdAsync(actorId, user, ct);

        public Task<Page<Actor>> SearchAsync(SearchRequest<ActorFilter, ActorSortField> request, UserContext user, CancellationToken ct = default) =>
            _actorRepository.SearchAsync(request, user, ct);

        public async Task<Actor> CreateAsync(CreateActorRequest request, UserContext user, CancellationToken ct = default)
        {
            if (await _actorRepository.ExistsAsync(request.FullName, user, ct))
            {
                throw new ValidationException($"Actor '{request.FullName}' already exists.");
            }

            var actor = new Actor
            {
                FullName = request.FullName,
                NormalizedFullName = Helpers.Normalize(request.FullName),
                BirthDate = request.BirthDate,
                Biography = request.Biography,
                PhotoUrl = request.PhotoUrl,
                Visibility = request.Visibility,
                OwnerUserId = user.UserId,
                CreatedByUserId = user.UserId
            };

            await _actorRepository.CreateAsync(actor, ct);

            await _realtimeService.PublishAsync(user.UserId, actor.Visibility, ResourceType.Actor, EventType.Created, actor.Id);

            return actor;
        }

        public async Task<Actor> UpdateAsync(UpdateActorRequest request, UserContext user, CancellationToken ct = default)
        {
            var actor = await _actorRepository.GetByIdAsync(request.ActorId, user, ct)
                ?? throw new ApplicationException($"Actor '{request.ActorId}' not found.");

            user.EnsureCanEdit(actor);

            if (request.FullName is not null)
            {
                actor.FullName = request.FullName;
                actor.NormalizedFullName = Helpers.Normalize(request.FullName);
            }
            if (request.BirthDate.HasValue)
            {
                actor.BirthDate = request.BirthDate.Value;
            }
            if (request.Biography is not null)
            {
                actor.Biography = request.Biography;
            }
            if (request.PhotoUrl is not null)
            {
                actor.PhotoUrl = request.PhotoUrl;
            }
            if (request.Visibility.HasValue)
            {
                var hasPublicMedia = await _mediaRepository.HasPublicMediaUsingActorAsync(request.ActorId, ct);

                if (hasPublicMedia && request.Visibility == Visibility.Private)
                {
                    throw new ValidationException("Public media cannot contain private actors.");
                }

                actor.Visibility = request.Visibility.Value;
            }

            actor.LastModifiedByUserId = user.UserId;

            await _actorRepository.UpdateAsync(actor, ct);

            await _realtimeService.PublishAsync(user.UserId, actor.Visibility, ResourceType.Actor, EventType.Updated, actor.Id);

            return actor;
        }

        public async Task DeleteAsync(string actorId, UserContext user, CancellationToken ct = default)
        {
            if (!user.IsAdmin)
            {
                throw new ApplicationException("Only admins can delete actors.");
            }

            var actor = await _actorRepository.GetByIdAsync(actorId, user, ct);

            if (actor is null)
            {
                return;
            }

            await _actorRepository.DeleteAsync(actorId, ct);

            await _realtimeService.PublishAsync(user.UserId, actor.Visibility, ResourceType.Actor, EventType.Deleted, actor.Id);
        }
    }
}
