using MongoDB.Driver;
using MongoDB.Driver.Linq;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{
    public sealed class MediaRepository(IMongoDatabase database) : BaseRepository<Media>(database, "media"), IMediaRepository
    {
        public Task<Media?> GetByIdAsync(string id, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<Media>();

            filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Id, id));

            return Collection.Find(filter).FirstOrDefaultAsync(ct)!;
        }

        public async Task<Page<Media>> SearchAsync(SearchRequest<MediaFilter, MediaSortField> request, UserContext user, CancellationToken ct = default)
        {
            var filter = CreateFilter(request, user);
            var sort = CreateSort(request);

            //todo: do the progection on db side and immidiatly map to MediaResponse
            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = await Collection.CountDocumentsAsync(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        public Task<List<Media>> GetByIdsAsync(string[] mediaIds, CancellationToken ct = default)
        {
            var ids = mediaIds.Distinct().ToArray();

            if (ids.Length == 0)
                return Task.FromResult(new List<Media>());

            var filter = _fBuilder.In(x => x.Id, ids);

            return Collection.Find(filter).ToListAsync(ct);
        }

        public Task<bool> ExistsAsync(string title, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<Media>();

            var query = title.Trim().ToUpperInvariant();

            filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.NormalizedTitle, new(Regex.Escape(query), "i")));

            return Collection.Find(filter).AnyAsync(ct);
        }

        public Task ResetCollectionAsync(string collectionId, CancellationToken ct = default)
        {
            var filter = _fBuilder.Where(x => x.Collection != null && x.Collection.Id == collectionId);

            var update = Builders<Media>.Update.Set(u => u.Collection, null);

            return Collection.UpdateManyAsync(filter, update, cancellationToken: ct);
        }

        public Task<bool> HasPrivateMediaInCollectionAsync(string collectionId, CancellationToken ct = default) =>
            Collection.Find(x => x.Collection != null && x.Collection.Id == collectionId && x.Visibility == Visibility.Private).AnyAsync(ct);

        public Task<bool> HasPublicMediaUsingActorAsync(string actorId, CancellationToken ct = default) =>
            Collection.Find(x => x.Visibility == Visibility.Public && x.Cast.Any(c => c.ActorId == actorId)).AnyAsync(ct);

        public Task<bool> HasPublicMediaUsingCreatorAsync(string creatorId, CancellationToken ct = default) =>
            Collection.Find(x => x.Visibility == Visibility.Public && x.Creator != null && x.Creator.Id == creatorId).AnyAsync(ct);

        private FilterDefinition<Media> CreateFilter(SearchRequest<MediaFilter, MediaSortField> request, UserContext user)
        {
            var filter = user.BuildVisibilityFilter<Media>();

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Query))
            {
                var query = request.Filter.Query.Trim();

                var sub = _fBuilder.Or(
                    _fBuilder.Regex(x => x.NormalizedTitle, new(Regex.Escape(query), "i")),
                    _fBuilder.Regex(x => x.Description, new(Regex.Escape(query), "i")));

                filter = _fBuilder.And(filter, sub);
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.Genre))
            {
                filter = _fBuilder.And(filter, _fBuilder.AnyEq(x => x.Genres, request.Filter.Genre));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.Tag))
            {
                filter = _fBuilder.And(filter, _fBuilder.AnyEq(x => x.Tags, request.Filter.Tag));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.ActorId))
            {
                filter = _fBuilder.And(filter, _fBuilder.ElemMatch(x => x.Cast, actor => actor.ActorId == request.Filter.ActorId));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.Creator))
            {
                var query = request.Filter.Creator.Trim();

                filter = _fBuilder.And(filter, _fBuilder.Regex("Creator.NormalizedName", new(Regex.Escape(query), "i")));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.CreatorId))
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq("Creator.Id", request.Filter.CreatorId));
            }
            if (request.Filter.Type.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Type, request.Filter.Type));
            }
            if (request.Filter.Visibility.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Visibility, request.Filter.Visibility.Value));
            }

            return filter;
        }

        private SortDefinition<Media>? CreateSort(SearchRequest<MediaFilter, MediaSortField> request) => request.Sort?.Field switch
        {
            MediaSortField.Title => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.Title)
                : _sBuilder.Descending(x => x.Title),
            MediaSortField.Creator => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending("Creator.Name")
                : _sBuilder.Descending("Creator.Name"),
            MediaSortField.ReleaseYear => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.ReleaseYear)
                : _sBuilder.Descending(x => x.ReleaseYear),
            MediaSortField.CreatedAt => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.CreatedAtUtc)
                : _sBuilder.Descending(x => x.CreatedAtUtc),
            MediaSortField.UpdatedAt => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.UpdatedAtUtc)
                : _sBuilder.Descending(x => x.UpdatedAtUtc),
            _ => null
        };
    }
}
