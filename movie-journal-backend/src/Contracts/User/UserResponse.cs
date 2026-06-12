using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.User
{
    public record UserResponse(
        string Id,
        string Login,
        string? DisplayName,
        List<UserRole> Roles,
        DateTime CreatedAtUtc
    );
}
