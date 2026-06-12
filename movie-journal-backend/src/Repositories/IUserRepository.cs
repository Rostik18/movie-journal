using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.User;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface IUserRepository : IRepository<User>
    {
        Task<Page<User>> SearchAsync(SearchRequest<UserFilter, UserSortField> request, CancellationToken ct = default);
        Task<User?> GetByLoginAsync(string login, CancellationToken ct = default);
        Task<bool> AnyInRoleAsync(UserRole role, CancellationToken ct = default);
    }
}
