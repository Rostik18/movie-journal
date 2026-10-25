using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    public sealed record ActorResponseSlim(
        string Id,
        string FullName,
        string? PhotoUrl,
        Visibility Visibility);
}
