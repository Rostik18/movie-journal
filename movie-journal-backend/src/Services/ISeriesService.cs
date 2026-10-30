using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Series;
using MovieJournalBackend.Entities.Series;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface ISeriesService
    {
        Task<Series?> GetByIdAsync(string seriesId, UserContext user, CancellationToken ct = default);
        Task<Page<Series>> SearchAsync(SearchRequest<SeriesFilter, SeriesSortField> request, UserContext user, CancellationToken ct = default);
        Task<Series> CreateAsync(CreateSeriesRequest request, UserContext user, CancellationToken ct = default);
        Task<Series> UpdateAsync(UpdateSeriesRequest request, UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string seriesId, UserContext user, CancellationToken ct = default);
    }
}
