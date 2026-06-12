using MongoDB.Driver;
using MovieJournalBackend.Contracts.Actor;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{
    public sealed class ActorRepository(IMongoDatabase database) : BaseRepository<Actor>(database, "actors"), IActorRepository
    {
        public Task<Actor?> GetByIdAsync(string actorId, UserContext user, CancellationToken ct = default)
        {
            var filter = _fBuilder.And(_fBuilder.Eq(x => x.Id, actorId), user.BuildVisibilityFilter<Actor>());

            return Collection.Find(filter).FirstOrDefaultAsync(ct)!;
        }

        public Task<bool> ExistsAsync(string fullName, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<Actor>();

            var normalized = fullName.Trim().ToUpperInvariant();

            filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.NormalizedFullName, normalized));

            return Collection.Find(filter).AnyAsync(ct);
        }

        public async Task<Page<Actor>> SearchAsync(SearchRequest<ActorFilter, ActorSortField> request, UserContext user, CancellationToken ct = default)
        {
            var filter = CreateFilter(request, user);
            var sort = CreateSort(request);

            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = await Collection.CountDocumentsAsync(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        public Task<bool> HasPrivateActorsAsync(IEnumerable<string> actorIds, CancellationToken ct = default) =>
            Collection.Find(x => actorIds.Contains(x.Id) && x.Visibility == Visibility.Private).AnyAsync(ct);

        private FilterDefinition<Actor> CreateFilter(SearchRequest<ActorFilter, ActorSortField> request, UserContext user)
        {
            var filter = user.BuildVisibilityFilter<Actor>();

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Name))
            {
                var normalizedQuery = request.Filter.Name.Trim().ToUpperInvariant();

                filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.NormalizedFullName, new($"^{Regex.Escape(normalizedQuery)}")));
            }
            if (request.Filter.HasPhoto.HasValue)
            {
                filter = request.Filter.HasPhoto.Value
                    ? _fBuilder.And(filter, _fBuilder.Ne(x => x.PhotoUrl, null))
                    : _fBuilder.And(filter, _fBuilder.Eq(x => x.PhotoUrl, null));
            }
            if (request.Filter.BirthYear.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Where(x => x.BirthDate.HasValue && x.BirthDate.Value.Year == request.Filter.BirthYear));
            }

            return filter;
        }

        private SortDefinition<Actor>? CreateSort(SearchRequest<ActorFilter, ActorSortField> request) => request.Sort?.Field switch
        {
            ActorSortField.FullName => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.FullName)
                : _sBuilder.Descending(x => x.FullName),
            ActorSortField.BirthDate => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.BirthDate)
                : _sBuilder.Descending(x => x.BirthDate),
            ActorSortField.CreatedAt => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.CreatedAtUtc)
                : _sBuilder.Descending(x => x.CreatedAtUtc),
            ActorSortField.UpdatedAt => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.UpdatedAtUtc)
                : _sBuilder.Descending(x => x.UpdatedAtUtc),
            _ => null
        };
    }
}
