using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.User;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface IUserService
    {
        Task<Page<User>> SearchAsync(SearchRequest<UserFilter, UserSortField> request, UserContext user, CancellationToken ct = default);
        Task<User?> GetByIdAsync(string userId, UserContext user, CancellationToken ct = default);
        Task<User> GetCurrentUserAsync(UserContext user, CancellationToken ct = default);
        Task<User> CreateAsync(CreateUserRequest request, UserContext user, CancellationToken ct = default);
        Task<User> UpdateAsync(UpdateUserRequest request, UserContext user, CancellationToken ct = default);
        Task<User> ChangePasswordAsync(ChangePasswordRequest request, UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string userId, UserContext user, CancellationToken ct = default);
    }
}
