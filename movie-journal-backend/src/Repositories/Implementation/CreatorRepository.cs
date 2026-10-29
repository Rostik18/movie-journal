using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Creator;
using MovieJournalBackend.Entities.Creator;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{
    public class CreatorRepository(IMongoDatabase database) : BaseRepository<Creator>(database, "creators"), ICreatorRepository
    {
        public Task<Creator?> GetByIdAsync(string creatorId, UserContext user, CancellationToken ct = default)
        {
            var filter = _fBuilder.And(_fBuilder.Eq(x => x.Id, creatorId), user.BuildVisibilityFilter<Creator>());

            return Collection.Find(filter).FirstOrDefaultAsync(ct)!;
        }

        public async Task<Page<Creator>> SearchAsync(SearchRequest<CreatorFilter, CreatorSortField> request, UserContext user, CancellationToken ct = default)
        {
            var filter = CreateFilter(request, user);
            var sort = CreateSort(request);

            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = Collection.CountDocuments(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        public Task<bool> ExistsAsync(string name, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<Creator>();

            var normalized = name.Trim().ToUpperInvariant();

            filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.NormalizedName, normalized));

            return Collection.Find(filter).AnyAsync(ct);
        }

        private FilterDefinition<Creator> CreateFilter(SearchRequest<CreatorFilter, CreatorSortField> request, UserContext user)
        {
            var filter = user.BuildVisibilityFilter<Creator>();

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Query))
            {
                var query = request.Filter.Query.Trim();

                var sub = _fBuilder.Or(
                    _fBuilder.Regex(x => x.NormalizedName, new(Regex.Escape(query), "i")),
                    _fBuilder.Regex(x => x.Description, new(Regex.Escape(query), "i")));

                filter = _fBuilder.And(filter, sub);
            }
            if (request.Filter.HasPhoto.HasValue)
            {
                filter = request.Filter.HasPhoto.Value
                    ? _fBuilder.And(filter, _fBuilder.Ne(x => x.ImageUrl, null), _fBuilder.Ne(x => x.ImageUrl, ""))
                    : _fBuilder.And(filter, _fBuilder.Eq(x => x.ImageUrl, null));
            }
            if (request.Filter.Visibility.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Visibility, request.Filter.Visibility.Value));
            }

            return filter;
        }

        private SortDefinition<Creator>? CreateSort(SearchRequest<CreatorFilter, CreatorSortField> request) => request.Sort?.Field switch
        {
            CreatorSortField.Name => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.Name)
                : _sBuilder.Descending(x => x.Name),
            CreatorSortField.CreatedAt => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.CreatedAtUtc)
                : _sBuilder.Descending(x => x.CreatedAtUtc),
            CreatorSortField.UpdatedAt => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.UpdatedAtUtc)
                : _sBuilder.Descending(x => x.UpdatedAtUtc),
            _ => null
        };
    }
}
