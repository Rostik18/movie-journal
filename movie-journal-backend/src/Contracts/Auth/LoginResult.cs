using MovieJournalBackend.Contracts.User;

namespace MovieJournalBackend.Contracts.Auth
{
    public class LoginResult
    {
        public required string AccessToken { get; init; }
        public DateTime ExpiresAtUtc { get; init; }
        public required UserResponse User { get; init; }
    }
}
