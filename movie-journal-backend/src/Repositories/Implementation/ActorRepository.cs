using MongoDB.Bson;
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

        public Task<List<Actor>> GetByIdsAsync(string[] actorIds, CancellationToken ct = default)
        {
            var ids = actorIds.Distinct().ToArray();

            if (ids.Length == 0)
                return Task.FromResult(new List<Actor>());

            var filter = _fBuilder.In(x => x.Id, ids);

            return Collection.Find(filter).ToListAsync(ct);
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

        public Task<List<string>> GetCountryCodesAsync(CancellationToken ct = default) => Collection
            .Distinct<string>("Nationalities", FilterDefinition<Actor>.Empty, cancellationToken: ct)
            .ToListAsync(ct);

        public Task<bool> HasPrivateActorsAsync(IEnumerable<string> actorIds, CancellationToken ct = default) =>
            Collection.Find(x => actorIds.Contains(x.Id) && x.Visibility == Visibility.Private).AnyAsync(ct);

        public Task<long> GetCountAsync(SearchRequest<ActorFilter, ActorSortField> request, UserContext user, CancellationToken ct = default) =>
            Collection.CountDocumentsAsync(CreateFilter(request, user), cancellationToken: ct);

        public async Task<Dictionary<string, long>> GetCountByNationalityAsync(UserContext user, CancellationToken ct = default)
        {
            var visibilityFilter = user.BuildVisibilityFilter<Actor>();

            var result = await Collection
                .Aggregate()
                .Match(visibilityFilter)
                .Unwind(x => x.Nationalities)
                .Group(new BsonDocument
                {
                    { "_id", "$Nationalities" },
                    { "Count", new BsonDocument("$sum", 1) }
                })
                .ToListAsync(ct);

            return result.ToDictionary(
                x => x["_id"].AsString,
                x => x["Count"].ToInt64());
        }

        public async Task<Dictionary<int, long>> GetCountByBirthYearAsync(int fromYear, int toYear, UserContext user, CancellationToken ct = default)
        {
            var visibilityFilter = user.BuildVisibilityFilter<Actor>();

            var filter = Builders<Actor>.Filter.And(
                visibilityFilter,
                Builders<Actor>.Filter.Ne(x => x.BirthDate, null),
                Builders<Actor>.Filter.Gte(x => x.BirthDate, new(fromYear, 1, 1, 0, 0, 0, DateTimeKind.Utc)),
                Builders<Actor>.Filter.Lt(x => x.BirthDate, new(toYear + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc)));

            var result = await Collection
                .Aggregate()
                .Match(filter)
                .Group(
                    x => x.BirthDate!.Value.Year,
                    g => new
                    {
                        Year = g.Key,
                        Count = g.LongCount()
                    })
                .ToListAsync(ct);

            return result.ToDictionary(x => x.Year, x => x.Count);
        }

        private FilterDefinition<Actor> CreateFilter(SearchRequest<ActorFilter, ActorSortField> request, UserContext user)
        {
            var filter = user.BuildVisibilityFilter<Actor>();

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Query))
            {
                var query = request.Filter.Query.Trim();

                filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.NormalizedFullName, new(Regex.Escape(query), "i")));
            }
            if (request.Filter.HasPhoto.HasValue)
            {
                filter = request.Filter.HasPhoto.Value
                    ? _fBuilder.And(filter, _fBuilder.Ne(x => x.PhotoUrl, null), _fBuilder.Ne(x => x.PhotoUrl, ""))
                    : _fBuilder.And(filter, _fBuilder.Eq(x => x.PhotoUrl, null));
            }
            if (request.Filter.BirthYear.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Where(x => x.BirthDate.HasValue && x.BirthDate.Value.Year == request.Filter.BirthYear));
            }
            if (request.Filter.Visibility.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Visibility, request.Filter.Visibility.Value));
            }
            if (request.Filter.Sex.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Sex, request.Filter.Sex.Value));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.Nationality))
            {
                filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.Nationalities, new(Regex.Escape(request.Filter.Nationality), "i")));
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
            ActorSortField.Sex => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.Sex)
                : _sBuilder.Descending(x => x.Sex),
            ActorSortField.Nationality => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.Nationalities)
                : _sBuilder.Descending(x => x.Nationalities),
            _ => null
        };
    }
}
