using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    public sealed record ActorResponse(
        string Id,
        string FullName,
        DateTime? BirthDate,
        string? Biography,
        string? PhotoUrl,
        Visibility Visibility);
}
