using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Series;
using MovieJournalBackend.Entities.Series;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{

    public sealed class SeriesRepository(IMongoDatabase database) : BaseRepository<Series>(database, "series"), ISeriesRepository
    {
        public Task<Series?> GetByIdAsync(string id, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<Series>();

            filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Id, id));

            return Collection.Find(filter).FirstOrDefaultAsync(ct)!;
        }

        public async Task<Page<Series>> SearchAsync(SearchRequest<SeriesFilter, SeriesSortField> request, UserContext user, CancellationToken ct = default)
        {
            var filter = CreateFilter(request, user);
            var sort = CreateSort(request);

            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = await Collection.CountDocumentsAsync(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        public Task<bool> ExistsAsync(string title, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<Series>();

            var query = title.Trim().ToUpperInvariant();

            filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.NormalizedTitle, query));

            return Collection.Find(filter).AnyAsync(ct);
        }

        private FilterDefinition<Series> CreateFilter(SearchRequest<SeriesFilter, SeriesSortField> request, UserContext user)
        {
            var filter = user.BuildVisibilityFilter<Series>();

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Query))
            {
                var query = request.Filter.Query.Trim();

                var sub = _fBuilder.Or(
                    _fBuilder.Regex(x => x.NormalizedTitle, new(Regex.Escape(query), "i")),
                    _fBuilder.Regex(x => x.Description, new(Regex.Escape(query), "i")));

                filter = _fBuilder.And(filter, sub);
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.Tag))
            {
                filter = _fBuilder.And(filter, _fBuilder.AnyEq(x => x.Tags, request.Filter.Tag));
            }
            if (request.Filter.Visibility.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Visibility, request.Filter.Visibility.Value));
            }

            return filter;
        }

        private SortDefinition<Series>? CreateSort(SearchRequest<SeriesFilter, SeriesSortField> request) => request.Sort?.Field switch
        {
            SeriesSortField.Title => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.Title)
                    : _sBuilder.Descending(x => x.Title),
            SeriesSortField.CreatedAt => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.CreatedAtUtc)
                    : _sBuilder.Descending(x => x.CreatedAtUtc),
            SeriesSortField.UpdatedAt => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.UpdatedAtUtc)
                    : _sBuilder.Descending(x => x.UpdatedAtUtc),
            _ => null
        };
    }
}
