using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.User;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using MovieJournalBackend.Services.Auth;

namespace MovieJournalBackend.Services.Implementation
{
    public class UserService(
        IUserRepository _userRepository,
        IAuthService _authService,
        IPasswordService _passwords
        ) : IUserService
    {
        public async Task<User> CreateAsync(CreateUserRequest request, UserContext user, CancellationToken ct = default)
        {
            user.EnsureAdmin();

            return await _authService.RegisterAsync(new()
            {
                Login = request.Login,
                DisplayName = request.DisplayName,
                Password = request.Password,
            }, ct);
        }

        public Task DeleteAsync(string userId, UserContext user, CancellationToken ct = default)
        {
            user.EnsureAdmin();

            if (user.IsAdmin && user.UserId == userId)
                throw new ApplicationException("Admin cannot delete itself.");

            return _userRepository.DeleteAsync(userId, ct);
        }

        public async Task<User?> GetByIdAsync(string userId, UserContext user, CancellationToken ct = default)
        {
            user.EnsureAdmin();

            return await _userRepository.GetByIdAsync(userId, ct);
        }

        public async Task<User> GetCurrentUserAsync(UserContext user, CancellationToken ct = default)
        {
            var currentUser = await _userRepository.GetByIdAsync(user.UserId, ct);

            return currentUser is null
                ? throw new ApplicationException($"User '{user.UserId}' not found.")
                : currentUser;
        }

        public async Task<Page<User>> SearchAsync(SearchRequest<UserFilter, UserSortField> request, UserContext user, CancellationToken ct = default)
        {
            user.EnsureAdmin();

            return await _userRepository.SearchAsync(request, ct);
        }

        public async Task<User> UpdateAsync(UpdateUserRequest request, UserContext user, CancellationToken ct = default)
        {
            user.EnsureAdmin();

            var updateUser = await _userRepository.GetByIdAsync(request.UserId, ct)
                ?? throw new ApplicationException($"User '{request.UserId}' not found.");

            if (request.Login is not null)
            {
                updateUser.Login = request.Login;
            }
            if (request.DisplayName is not null)
            {
                updateUser.DisplayName = request.DisplayName;
            }
            if (request.Roles is not null)
            {
                updateUser.Roles = request.Roles.Count == 0
                    ? [UserRole.User]
                    : [.. request.Roles.Distinct()];
            }

            await _userRepository.UpdateAsync(updateUser, ct);

            return updateUser;
        }

        public async Task<User> ChangePasswordAsync(ChangePasswordRequest request, UserContext user, CancellationToken ct = default)
        {
            var canChange = user.IsAdmin || user.UserId == request.UserId;

            if (!canChange) throw new ApplicationException($"Only admin can change password for any user.");

            var updatedUser = await _userRepository.GetByIdAsync(request.UserId, ct)
                ?? throw new ApplicationException($"User '{request.UserId}' not found.");

            updatedUser.PasswordHash = _passwords.HashPassword(request.NewPassword);

            await _userRepository.UpdateAsync(updatedUser, ct);

            return updatedUser;
        }
    }
}
