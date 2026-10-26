using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class UserWatchingService(
        IUserWatchingRepository watchingRepository,
        IMediaService mediaService,
        IMediaRepository mediaRepository,
        IRealtimeService _realtimeService)
        : IUserWatchingService
    {
        public async Task<UserWatchingResponse?> GetByMediaAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var watching = await watchingRepository.GetByUserAndMediaAsync(user.UserId, mediaId, ct);

            if (watching is null) return null;

            var media = await mediaService.GetByIdAsync(mediaId, user, ct);

            return watching.ToResponse(media!.ToResponse());
        }

        public async Task<UserWatchingResponseSb?> GetByMediaSbAsync(string mediaId, UserContext user, CancellationToken ct = default)
        {
            var watching = await watchingRepository.GetByUserAndMediaAsync(user.UserId, mediaId, ct);

            if (watching is null) return null;

            var media = await mediaService.GetByIdSbAsync(mediaId, user, ct);

            if (media is null) return null;

            return watching.ToResponseSb(media);
        }

        public async Task<Page<UserWatchingResponseSlim>> SearchAsync(SearchRequest<UserWatchingFilter, UserWatchingSortField> request, UserContext user, CancellationToken ct = default)
        {
            var page = await watchingRepository.SearchAsync(request, user, ct);

            var mediaIds = page.Items
                .Select(x => x.MediaId)
                .Distinct()
                .ToArray();

            var mediaItems = await mediaRepository.GetByIdsAsync(mediaIds, ct);

            var mediaById = mediaItems.ToDictionary(x => x.Id);

            var items = page.Items
                .Where(x => mediaById.ContainsKey(x.MediaId))
                .Select(x => x.ToResponseSlim(
                    mediaById[x.MediaId].ToResponseSlim()))
                .ToList();

            return new(
                items,
                page.Offset,
                page.Size,
                page.TotalCount);
        }

        public async Task<UserWatchingResponse> CreateAsync(CreateUserWatchingRequest request, UserContext user, CancellationToken ct = default)
        {
            var media = await mediaService.GetByIdAsync(request.MediaId, user, ct)
                ?? throw new NotFoundException("Media not found.");

            var existing = await watchingRepository.GetByUserAndMediaAsync(user.UserId, request.MediaId, ct);

            if (existing is not null)
            {
                return await UpdateAsync(new()
                {
                    MediaId = request.MediaId,
                    Status = request.Status,
                    Rating = request.Rating,
                    Visibility = request.Visibility,
                    StoppedAtSeconds = request.StoppedAtSeconds,
                    CurrentEpisodeNumber = request.CurrentEpisodeNumber,
                    CurrentSeasonNumber = request.CurrentSeasonNumber,
                    Notes = request.Notes
                },
                user, existing, ct);
            }

            var entity = new UserWatching
            {
                UserId = user.UserId,
                MediaId = media.Id,
                Title = media.Title,
                NormalizedTitle = Helpers.Normalize(media.Title),
                Type = media.Type,
                Status = request.Status,
                Rating = request.Rating,
                Notes = request.Notes,
                Visibility = request.Visibility ?? media.Visibility,
                StoppedAtSeconds = request.StoppedAtSeconds,
                CurrentSeasonNumber = request.CurrentSeasonNumber,
                CurrentEpisodeNumber = request.CurrentEpisodeNumber,

                StartedAtUtc = request.Status == WatchStatus.Watching ? DateTime.UtcNow : null,
                FinishedAtUtc = request.Status == WatchStatus.Watched ? DateTime.UtcNow : null
            };

            await watchingRepository.CreateAsync(entity, ct);

            await _realtimeService.PublishAsync(entity.UserId, Visibility.Private, ResourceType.UserWatching, EventType.Created, media.Id);

            return entity.ToResponse(media.ToResponse());
        }

        public async Task<UserWatchingResponse> UpdateAsync(UpdateUserWatchingRequest request, UserContext user, UserWatching? existingEntity = null, CancellationToken ct = default)
        {
            var entity = existingEntity
                ?? await watchingRepository.GetByUserAndMediaAsync(user.UserId, request.MediaId, ct)
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
            if (request.Visibility.HasValue)
            {
                entity.Visibility = request.Visibility.Value;
            }

            await watchingRepository.UpdateAsync(entity, ct);

            await _realtimeService.PublishAsync(entity.UserId, Visibility.Private, ResourceType.UserWatching, EventType.Updated, entity.MediaId);

            var media = await mediaService.GetByIdAsync(request.MediaId, user, ct);

            return entity.ToResponse(media!.ToResponse());
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
