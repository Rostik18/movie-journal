using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{

    public sealed class UserWatchingRepository(IMongoDatabase database
        ) : BaseRepository<UserWatching>(database, "userWatching"), IUserWatchingRepository
    {
        public Task<long> CountByStatusAsync(string userId, WatchStatus status, CancellationToken ct = default) =>
            Collection.CountDocumentsAsync(x => x.UserId == userId && x.Status == status, cancellationToken: ct);

        public Task DeleteByUserAndMediaAsync(string userId, string mediaId, CancellationToken ct = default) =>
            Collection.DeleteOneAsync(x => x.UserId == userId && x.MediaId == mediaId, cancellationToken: ct);

        public Task<UserWatching?> GetByUserAndMediaAsync(string userId, string mediaId, CancellationToken ct = default) =>
            Collection.Find(x => x.UserId == userId && x.MediaId == mediaId).FirstOrDefaultAsync(ct)!;

        public async Task<Page<UserWatching>> SearchAsync(SearchRequest<UserWatchingFilter, UserWatchingSortField> request, UserContext user, CancellationToken ct = default)
        {
            var filter = CreateFilter(request, user);
            var sort = CreateSort(request);

            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = await Collection.CountDocumentsAsync(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        private FilterDefinition<UserWatching> CreateFilter(SearchRequest<UserWatchingFilter, UserWatchingSortField> request, UserContext user)
        {
            var filter = _fBuilder.Eq(x => x.UserId, user.UserId);

            var f = request.Filter;

            if (f is null)
            {
                return filter;
            }
            if (!string.IsNullOrWhiteSpace(f.Query))
            {
                var normalizedQuery = f.Query.Trim().ToUpperInvariant();

                filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.NormalizedTitle, new Regex($"^{Regex.Escape(normalizedQuery)}")));
            }
            if (!string.IsNullOrWhiteSpace(f.MediaId))
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.MediaId, f.MediaId));
            }
            if (f.Status.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Status, f.Status.Value));
            }
            if (f.Type.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Type, f.Type.Value));
            }
            if (f.MinRating.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Gte(x => x.Rating, f.MinRating.Value));
            }
            if (f.MaxRating.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Lte(x => x.Rating, f.MaxRating.Value));
            }
            if (f.HasRating.HasValue)
            {
                filter = f.HasRating.Value
                    ? _fBuilder.And(filter, _fBuilder.Ne(x => x.Rating, null))
                    : _fBuilder.And(filter, _fBuilder.Eq(x => x.Rating, null));
            }
            if (f.HasNotes.HasValue)
            {
                filter = f.HasNotes.Value
                    ? _fBuilder.And(filter,
                        _fBuilder.Ne(x => x.Notes, null),
                        _fBuilder.Ne(x => x.Notes, string.Empty))
                    : _fBuilder.And(filter,
                        _fBuilder.Or(
                            _fBuilder.Eq(x => x.Notes, null),
                            _fBuilder.Eq(x => x.Notes, string.Empty)));
            }
            if (f.StartedFromUtc.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Gte(x => x.StartedAtUtc, f.StartedFromUtc.Value));
            }
            if (f.StartedToUtc.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Lte(x => x.StartedAtUtc, f.StartedToUtc.Value));
            }
            if (f.FinishedFromUtc.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Gte(x => x.FinishedAtUtc, f.FinishedFromUtc.Value));
            }
            if (f.FinishedToUtc.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Lte(x => x.FinishedAtUtc, f.FinishedToUtc.Value));
            }

            return filter;
        }

        private SortDefinition<UserWatching>? CreateSort(SearchRequest<UserWatchingFilter, UserWatchingSortField> request) =>
            request.Sort?.Field switch
            {
                UserWatchingSortField.Title => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.NormalizedTitle)
                    : _sBuilder.Descending(x => x.NormalizedTitle),
                UserWatchingSortField.Status => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.Status)
                    : _sBuilder.Descending(x => x.Status),
                UserWatchingSortField.Rating => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.Rating)
                    : _sBuilder.Descending(x => x.Rating),
                UserWatchingSortField.StartedAt => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.StartedAtUtc)
                    : _sBuilder.Descending(x => x.StartedAtUtc),
                UserWatchingSortField.FinishedAt => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.FinishedAtUtc)
                    : _sBuilder.Descending(x => x.FinishedAtUtc),
                UserWatchingSortField.CreatedAt => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.CreatedAtUtc)
                    : _sBuilder.Descending(x => x.CreatedAtUtc),
                UserWatchingSortField.UpdatedAt => request.Sort.Direction == SortDirection.Ascending
                    ? _sBuilder.Ascending(x => x.UpdatedAtUtc)
                    : _sBuilder.Descending(x => x.UpdatedAtUtc),
                _ => _sBuilder.Descending(x => x.UpdatedAtUtc)
            };
    }
}
