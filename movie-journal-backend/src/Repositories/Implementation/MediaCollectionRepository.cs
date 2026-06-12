using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{
    public sealed class MediaCollectionRepository(IMongoDatabase database)
        : BaseRepository<MediaCollection>(database, "mediaCollections"), IMediaCollectionRepository
    {
        public async Task<Page<MediaCollection>> SearchAsync(SearchRequest<MediaCollectionFilter, MediaCollectionSortField> request, UserContext user, CancellationToken ct = default)
        {
            var filter = CreateFilter(request, user);
            var sort = CreateSort(request);

            //todo: do the progection on db side and immidiatly map to MediaResponse
            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = await Collection.CountDocumentsAsync(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        public Task<MediaCollection?> GetByIdAsync(string id, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<MediaCollection>();

            filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Id, id));

            return Collection.Find(filter).FirstOrDefaultAsync(ct)!;
        }

        public Task<bool> ExistsAsync(string name, UserContext user, CancellationToken ct = default)
        {
            var filter = user.BuildVisibilityFilter<MediaCollection>();

            var normalizedQuery = name.Trim().ToUpperInvariant();

            filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.Name, new($"^{Regex.Escape(normalizedQuery)}")));

            return Collection.Find(filter).AnyAsync(ct);
        }

        public Task<List<MediaCollection>> GetByOwnerAsync(string ownerUserId, CancellationToken ct = default) =>
            Collection.Find(x => x.OwnerUserId == ownerUserId).ToListAsync(ct);

        public Task<MediaCollection?> GetByNameAsync(string name, string ownerUserId, CancellationToken ct = default) =>
            Collection.Find(x => x.Name == name && x.OwnerUserId == ownerUserId).FirstOrDefaultAsync(ct)!;

        public async Task<List<MediaCollection>> SearchAsync(string query, CancellationToken ct = default)
        {
            var normalizedQuery = query.Trim();

            return await Collection.Find(x => x.Name.Contains(normalizedQuery)).ToListAsync(ct);
        }

        private FilterDefinition<MediaCollection> CreateFilter(SearchRequest<MediaCollectionFilter, MediaCollectionSortField> request, UserContext user)
        {
            var filter = user.BuildVisibilityFilter<MediaCollection>();

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Query))
            {
                var normalizedQuery = request.Filter.Query.Trim().ToUpperInvariant();
                filter = _fBuilder.And(filter, _fBuilder.Regex(x => x.Name.ToUpper(), new($"^{Regex.Escape(normalizedQuery)}")));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.Tag))
            {
                filter = _fBuilder.And(filter, _fBuilder.AnyEq(x => x.Tags, request.Filter.Tag));
            }
            if (request.Filter.Visibility.HasValue)
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.Visibility, request.Filter.Visibility.Value));
            }
            if (!string.IsNullOrWhiteSpace(request.Filter.OwnerUserId))
            {
                filter = _fBuilder.And(filter, _fBuilder.Eq(x => x.OwnerUserId, request.Filter.OwnerUserId));
            }
            if (request.Filter.HasPoster.HasValue)
            {
                filter = request.Filter.HasPoster.Value
                    ? _fBuilder.And(filter, _fBuilder.Ne(x => x.PosterUrl, null))
                    : _fBuilder.And(filter, _fBuilder.Eq(x => x.PosterUrl, null));
            }

            return filter;
        }

        private SortDefinition<MediaCollection>? CreateSort(SearchRequest<MediaCollectionFilter, MediaCollectionSortField> request) => request.Sort?.Field switch
        {
            MediaCollectionSortField.Name => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.Name)
                : _sBuilder.Descending(x => x.Name),
            _ => null
        };
    }
}
