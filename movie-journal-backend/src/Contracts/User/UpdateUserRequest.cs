using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.User
{
    public class UpdateUserRequest
    {
        public required string UserId { get; set; }
        public string? Login { get; set; }
        public string? DisplayName { get; set; }
        public List<UserRole>? Roles { get; set; }
    }
}
