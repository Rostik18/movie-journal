using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class UserWatchingService(
        IUserWatchingRepository watchingRepository,
        IMediaRepository mediaRepository,
        IRealtimeService _realtimeService)
        : IUserWatchingService
    {
        public Task<UserWatching?> GetByMediaAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            return watchingRepository.GetByUserAndMediaAsync(user.UserId, mediaId, ct);
        }

        public Task<Page<UserWatching>> SearchAsync(SearchRequest<UserWatchingFilter, UserWatchingSortField> request, UserContext user, CancellationToken ct = default)
        {
            return watchingRepository.SearchAsync(request, user, ct);
        }

        public async Task<UserWatching> CreateAsync(CreateUserWatchingRequest request, UserContext user, CancellationToken ct = default)
        {
            var media = await mediaRepository.GetByIdAsync(request.MediaId, ct)
                ?? throw new NotFoundException("Media not found.");

            user.EnsureCanRead(media);

            var existing = await watchingRepository.GetByUserAndMediaAsync(user.UserId, request.MediaId, ct);

            if (existing is not null)
            {
                throw new ValidationException("Media already exists in user journal.");
            }

            var entity = new UserWatching
            {
                UserId = user.UserId,
                MediaId = media.Id,
                Title = media.Title,
                NormalizedTitle = media.NormalizedTitle,
                Type = media.Type,
                Status = request.Status,
                Rating = request.Rating,
                Notes = request.Notes,
                StoppedAtSeconds = request.StoppedAtSeconds,
                CurrentSeasonNumber = request.CurrentSeasonNumber,
                CurrentEpisodeNumber = request.CurrentEpisodeNumber,

                StartedAtUtc = request.Status == WatchStatus.Watching ? DateTime.UtcNow : null,
                FinishedAtUtc = request.Status == WatchStatus.Watched ? DateTime.UtcNow : null
            };

            await watchingRepository.CreateAsync(entity, ct);

            await _realtimeService.PublishAsync(entity.UserId, Visibility.Private, ResourceType.UserWatching, EventType.Created, media.Id);

            return entity;
        }

        public async Task<UserWatching> UpdateAsync(UpdateUserWatchingRequest request, UserContext user, CancellationToken ct = default)
        {
            var entity = await watchingRepository.GetByUserAndMediaAsync(user.UserId, request.MediaId, ct)
                ?? throw new NotFoundException("User watching entry not found.");

            if (request.Status.HasValue && entity.Status != request.Status.Value)
            {
                if (request.Status == WatchStatus.Watching && entity.StartedAtUtc is null)
                {
                    entity.StartedAtUtc = DateTime.UtcNow;
                }
                if (request.Status == WatchStatus.Watched && entity.FinishedAtUtc is null)
                {
                    entity.FinishedAtUtc = DateTime.UtcNow;
                }

                entity.Status = request.Status.Value;
            }
            if (request.Rating.HasValue)
            {
                entity.Rating = request.Rating.Value;
            }
            if (request.Notes is not null)
            {
                entity.Notes = request.Notes;
            }
            if (request.StoppedAtSeconds.HasValue)
            {
                entity.StoppedAtSeconds = request.StoppedAtSeconds.Value;
            }
            if (request.CurrentSeasonNumber.HasValue)
            {
                entity.CurrentSeasonNumber = request.CurrentSeasonNumber.Value;
            }
            if (request.CurrentEpisodeNumber.HasValue)
            {
                entity.CurrentEpisodeNumber = request.CurrentEpisodeNumber.Value;
            }

            await watchingRepository.UpdateAsync(entity, ct);

            await _realtimeService.PublishAsync(entity.UserId, Visibility.Private, ResourceType.UserWatching, EventType.Updated, entity.MediaId);

            return entity;
        }

        public Task<long> CountByStatusAsync(WatchStatus status, UserContext user, CancellationToken ct = default)
        {
            return watchingRepository.CountByStatusAsync(user.UserId, status, ct);
        }

        public async Task<Dictionary<WatchStatus, long>> GetStatisticsAsync(UserContext user, CancellationToken ct = default)
        {
            return new Dictionary<WatchStatus, long>()
            {
                { WatchStatus.Wishlist, await CountByStatusAsync(WatchStatus.Wishlist, user, ct) },
                { WatchStatus.Watching, await CountByStatusAsync(WatchStatus.Watching, user, ct) },
                { WatchStatus.Watched, await CountByStatusAsync(WatchStatus.Watched, user, ct) },
                { WatchStatus.Dropped, await CountByStatusAsync(WatchStatus.Dropped, user, ct) }
            };
        }

        public async Task DeleteAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var entity = await watchingRepository.GetByUserAndMediaAsync(user.UserId, mediaId, ct);

            if (entity is null)
            {
                return;
            }

            await watchingRepository.DeleteAsync(entity.Id, ct);

            await _realtimeService.PublishAsync(entity.UserId, Visibility.Private, ResourceType.UserWatching, EventType.Updated, entity.MediaId);
        }
    }
}
