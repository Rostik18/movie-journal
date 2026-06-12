using MovieJournalBackend.Contracts.Auth;
using MovieJournalBackend.Entities.User;

namespace MovieJournalBackend.Services.Auth
{
    public interface IAuthService
    {
        Task<User> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
        Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default);
    }
}
