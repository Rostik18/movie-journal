using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Series;
using MovieJournalBackend.Entities.Series;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class SeriesService(
        ISeriesRepository _seriesRepository,
        IRealtimeService _realtimeService
        ) : ISeriesService
    {
        public Task<Series?> GetByIdAsync(string seriesId, UserContext user, CancellationToken ct = default)
        {
            return _seriesRepository.GetByIdAsync(seriesId, user, ct);
        }

        public Task<Page<Series>> SearchAsync(
            SearchRequest<SeriesFilter, SeriesSortField> request, UserContext user, CancellationToken ct = default)
        {
            return _seriesRepository.SearchAsync(request, user, ct);
        }

        public async Task<Series> CreateAsync(CreateSeriesRequest request, UserContext user, CancellationToken ct = default)
        {
            if (await _seriesRepository.ExistsAsync(request.Title, user, ct))
            {
                throw new ValidationException($"Series '{request.Title}' already exists.");
            }

            var series = new Series
            {
                Title = request.Title,
                NormalizedTitle = request.Title.Trim().ToUpperInvariant(),
                OriginalTitle = request.OriginalTitle,
                Description = request.Description,
                PosterUrl = request.PosterUrl,
                Genres = request.Genres ?? [],
                Tags = request.Tags ?? [],
                Visibility = request.Visibility,
                OwnerUserId = user.UserId,
                CreatedByUserId = user.UserId,
            };

            await _seriesRepository.CreateAsync(series, ct);

            await _realtimeService.PublishAsync(user.UserId, series.Visibility, ResourceType.Series, EventType.Created, series.Id);

            return series;
        }

        public async Task<Series> UpdateAsync(UpdateSeriesRequest request, UserContext user, CancellationToken ct = default)
        {
            var series = await _seriesRepository.GetByIdAsync(request.SeriesId, user, ct)
                ?? throw new ApplicationException($"Series '{request.SeriesId}' not found.");

            user.EnsureCanEdit(series);

            if (request.Title is not null)
            {
                if (!string.Equals(series.Title, request.Title, StringComparison.OrdinalIgnoreCase)
                    && await _seriesRepository.ExistsAsync(request.Title, user, ct))
                {
                    throw new ValidationException($"Series '{request.Title}' already exists.");
                }

                series.Title = request.Title;
                series.NormalizedTitle = request.Title.Trim().ToUpperInvariant();
            }
            if (request.OriginalTitle is not null)
            {
                series.OriginalTitle = request.OriginalTitle;
            }
            if (!string.IsNullOrEmpty(request.Description))
            {
                series.Description = request.Description;
            }
            if (request.PosterUrl is not null)
            {
                series.PosterUrl = request.PosterUrl;
            }
            if (request.Genres is not null)
            {
                series.Genres = request.Genres;
            }
            if (request.Tags is not null)
            {
                series.Tags = request.Tags;
            }
            if (request.Visibility.HasValue)
            {
                series.Visibility = request.Visibility.Value;
            }

            series.LastModifiedByUserId = user.UserId;

            await _seriesRepository.UpdateAsync(series, ct);

            await _realtimeService.PublishAsync(user.UserId, series.Visibility, ResourceType.Series, EventType.Updated, series.Id);

            return series;
        }

        public async Task DeleteAsync(string seriesId, UserContext user, CancellationToken ct = default)
        {
            var series = await _seriesRepository.GetByIdAsync(seriesId, user, ct)
                ?? throw new ApplicationException($"Series '{seriesId}' not found.");

            user.EnsureCanDelete(series);

            await _seriesRepository.DeleteAsync(seriesId, ct);

            await _realtimeService.PublishAsync(user.UserId, series.Visibility, ResourceType.Series, EventType.Deleted, series.Id);
        }
    }
}
