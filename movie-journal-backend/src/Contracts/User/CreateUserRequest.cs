using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.User
{
    public class CreateUserRequest
    {
        public required string Login { get; set; }
        public string? DisplayName { get; set; }

        public List<UserRole> Roles { get; set; } = [UserRole.User];

        public required string Password { get; set; }
    }
}
