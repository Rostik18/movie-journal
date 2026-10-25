using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    public sealed record ActorResponse(
        string Id,
        string FullName,
        string? Alias,
        DateTime? BirthDate,
        string? Biography,
        string? PhotoUrl,
        Visibility Visibility,
        Sex? Sex,
        string? Nationality);
}
