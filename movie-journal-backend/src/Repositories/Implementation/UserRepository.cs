using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.User;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Repositories.Common;
using System.Text.RegularExpressions;

namespace MovieJournalBackend.Repositories.Implementation
{
    public class UserRepository(IMongoDatabase database) : BaseRepository<User>(database, "users"), IUserRepository
    {
        public async Task<Page<User>> SearchAsync(SearchRequest<UserFilter, UserSortField> request, CancellationToken ct = default)
        {
            var filter = CreateFilter(request);
            var sort = CreateSort(request);

            var items = await Collection.Find(filter).Sort(sort).Skip(request.Page.Offset).Limit(request.Page.Size).ToListAsync(ct);
            var total = Collection.CountDocuments(filter, cancellationToken: ct);

            return new(items, request.Page.Offset, request.Page.Size, total);
        }

        public Task<User?> GetByLoginAsync(string login, CancellationToken ct = default) =>
            Collection.Find(x => x.Login == login).FirstOrDefaultAsync(ct)!;

        public Task<bool> AnyInRoleAsync(UserRole role, CancellationToken ct = default) =>
            Collection.Find(x => x.Roles.Contains(role)).AnyAsync(ct);

        private FilterDefinition<User> CreateFilter(SearchRequest<UserFilter, UserSortField> request)
        {
            var filter = _fBuilder.Empty;

            if (request.Filter is null) return filter;

            if (!string.IsNullOrWhiteSpace(request.Filter.Name))
            {
                var normalizedQuery = request.Filter.Name.Trim().ToUpperInvariant();

                var sub = _fBuilder.Or(
                    _fBuilder.Regex(x => x.Login, new($"^{Regex.Escape(normalizedQuery)}")),
                    _fBuilder.Regex(x => x.DisplayName, new($"^{Regex.Escape(normalizedQuery)}")));

                filter = _fBuilder.And(filter, sub);
            }
            if (request.Filter.Role is not null)
            {
                filter = _fBuilder.And(filter, _fBuilder.AnyEq(x => x.Roles, request.Filter.Role.Value));
            }

            return filter;
        }

        private SortDefinition<User>? CreateSort(SearchRequest<UserFilter, UserSortField> request) => request.Sort?.Field switch
        {
            UserSortField.Name => request.Sort.Direction == SortDirection.Ascending
                ? _sBuilder.Ascending(x => x.Login)
                : _sBuilder.Descending(x => x.Login),
            _ => null
        };
    }
}
