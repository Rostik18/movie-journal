using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Series;
using MovieJournalBackend.Entities.Series;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface ISeriesRepository : IRepository<Series>
    {
        Task<Series?> GetByIdAsync(string id, UserContext user, CancellationToken ct = default);
        Task<Page<Series>> SearchAsync(SearchRequest<SeriesFilter, SeriesSortField> request, UserContext user, CancellationToken ct = default);
        Task<bool> ExistsAsync(string title, UserContext user, CancellationToken ct = default);
    }
}
