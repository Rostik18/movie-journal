using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.User
{
    public class UserFilter
    {
        public string? Name { get; init; }
        public UserRole? Role { get; init; }
    }
}
