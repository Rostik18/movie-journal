using MovieJournalBackend.Entities.User;

namespace MovieJournalBackend.Services.Auth
{
    public interface IJwtService
    {
        string GenerateToken(User user);
    }
}
