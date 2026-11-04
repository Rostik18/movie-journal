using MongoDB.Bson;
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

        public async Task<Dictionary<string, long>> GetCountByStatusAsync(string userId, CancellationToken ct = default)
        {
            var result = await Collection
                .Aggregate()
                .Match(x => x.UserId == userId)
                .Group(new BsonDocument
                {
                    { "_id", "$Status" },
                    { "Count", new BsonDocument("$sum", 1) }
                })
                .ToListAsync(ct);

            return result.ToDictionary(
                x => x["_id"].AsString,
                x => x["Count"].ToInt64());
        }

        public async Task<Dictionary<string, long>> GetCountByTypeAsync(string userId, CancellationToken ct = default)
        {
            var result = await Collection
                .Aggregate()
                .Match(x => x.UserId == userId)
                .Group(new BsonDocument
                {
                    { "_id", "$Type" },
                    { "Count", new BsonDocument("$sum", 1) }
                })
                .ToListAsync(ct);

            return result.ToDictionary(
                x => x["_id"].AsString,
                x => x["Count"].ToInt64());
        }

        public async Task<Dictionary<string, long>> GetCountByRatingAsync(string userId, CancellationToken ct = default)
        {
            var filter = Builders<UserWatching>.Filter.And(
                Builders<UserWatching>.Filter.Eq(x => x.UserId, userId),
                Builders<UserWatching>.Filter.Ne(x => x.Rating, null));

            var result = await Collection
                .Aggregate()
                .Match(filter)
                .Group(new BsonDocument
                {
                    { "_id", "$Rating" },
                    { "Count", new BsonDocument("$sum", 1) }
                })
                .ToListAsync(ct);

            return result.ToDictionary(
                x => x["_id"].ToString()!,
                x => x["Count"].ToInt64());
        }

        public async Task<Dictionary<string, long>> GetCountByGenreAsync(string userId, CancellationToken ct = default)
        {
            var result = await Collection
                .Aggregate()
                .Match(x => x.UserId == userId)
                .AppendStage<BsonDocument>(
                    new BsonDocument("$lookup", new BsonDocument
                    {
                        { "from", "media" },
                        { "localField", "MediaId" },
                        { "foreignField", "_id" },
                        { "as", "Media" }
                    }))
                .AppendStage<BsonDocument>(new BsonDocument("$unwind", "$Media"))
                .AppendStage<BsonDocument>(new BsonDocument("$unwind", "$Media.Genres"))
                .AppendStage<BsonDocument>(new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$Media.Genres" },
                    { "Count", new BsonDocument("$sum", 1) }
                }))
                .ToListAsync(ct);

            return result.ToDictionary(
                x => x["_id"].AsString,
                x => x["Count"].ToInt64());
        }

        public Task<Dictionary<string, long>> GetCountStartedByMonthAsync(string userId, CancellationToken ct = default) =>
            GetCountByMonthAsync(userId, "StartedAtUtc", ct);

        public Task<Dictionary<string, long>> GetCountFinishedByMonthAsync(string userId, CancellationToken ct = default) =>
            GetCountByMonthAsync(userId, "FinishedAtUtc", ct);

        private async Task<Dictionary<string, long>> GetCountByMonthAsync(string userId, string dateField, CancellationToken ct)
        {
            var filter = Builders<UserWatching>.Filter.And(
                Builders<UserWatching>.Filter.Eq(x => x.UserId, userId),
                Builders<UserWatching>.Filter.Ne(dateField, BsonNull.Value));

            var result = await Collection
                .Aggregate()
                .Match(filter)
                .AppendStage<BsonDocument>(
                    new BsonDocument("$group", new BsonDocument
                    {
                        {
                            "_id",
                            new BsonDocument("$dateToString", new BsonDocument
                            {
                                { "format", "%Y-%m" },
                                { "date", $"${dateField}" },
                                { "timezone", "UTC" }
                            })
                        },
                        { "Count", new BsonDocument("$sum", 1) }
                    }))
                .ToListAsync(ct);

            return result.ToDictionary(
                x => x["_id"].AsString,
                x => x["Count"].ToInt64());
        }

        public async Task<UserWatchingSummary> GetStatisticsSummaryAsync(string userId, CancellationToken ct = default)
        {
            var result = await Collection
                .Aggregate()
                .Match(x => x.UserId == userId)
                .Group(new BsonDocument
                {
                    { "_id", BsonNull.Value },
                    { "TotalMedia", new BsonDocument("$sum", 1) },
                    { "AverageRating", new BsonDocument("$avg", "$Rating") },
                    {
                        "Watched",
                        new BsonDocument("$sum", new BsonDocument("$cond", new BsonArray
                        {
                            new BsonDocument("$eq", new BsonArray { "$Status", WatchStatus.Watched.ToString() }),
                            1,
                            0
                        }))
                    },
                    {
                        "Dropped",
                        new BsonDocument("$sum", new BsonDocument("$cond", new BsonArray
                        {
                            new BsonDocument("$eq", new BsonArray { "$Status", WatchStatus.Dropped.ToString() }),
                            1,
                            0
                        }))
                    }
                })
                .FirstOrDefaultAsync(ct);

            if (result is null)
                return new(0, null, 0, 0);

            var total = result["TotalMedia"].ToInt64();

            return new UserWatchingSummary(
                TotalMedia: total,
                AverageRating: result["AverageRating"].IsBsonNull
                    ? null
                    : result["AverageRating"].ToDouble(),
                CompletionRate: total == 0 ? 0 : result["Watched"].ToDouble() / total * 100,
                DropRate: total == 0 ? 0 : result["Dropped"].ToDouble() / total * 100);
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
                var query = f.Query.Trim().ToUpperInvariant();

                filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.NormalizedTitle, new(Regex.Escape(query), "i")));
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
            if (f.Visibility.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Visibility, f.Visibility.Value));
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
