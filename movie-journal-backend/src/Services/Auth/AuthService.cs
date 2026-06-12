using MovieJournalBackend.Contracts.Auth;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Repositories;

namespace MovieJournalBackend.Services.Auth
{
    public sealed class AuthService(
        IUserRepository _usersRepo,
        IPasswordService _passwords,
        IJwtService _jwt
        ) : IAuthService
    {
        public async Task<User> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
        {
            var existingUser = await _usersRepo.GetByLoginAsync(request.Login, ct);

            if (existingUser is not null)
            {
                throw new InvalidOperationException("Login already exists.");
            }

            var user = new User
            {
                Login = request.Login,
                DisplayName = request.DisplayName,
                PasswordHash = _passwords.HashPassword(request.Password),
                Roles = [UserRole.User]
            };

            await _usersRepo.CreateAsync(user, ct);

            return user;
        }

        public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
        {
            var user = await _usersRepo.GetByLoginAsync(request.Login, ct)
                ?? throw new UnauthorizedAccessException();

            var valid = _passwords.VerifyPassword(request.Password, user.PasswordHash);

            if (!valid)
            {
                throw new UnauthorizedAccessException();
            }

            return new LoginResult
            {
                User = user.ToResponse(),
                AccessToken = $"Bearer {_jwt.GenerateToken(user)}",
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            };
        }
    }
}
