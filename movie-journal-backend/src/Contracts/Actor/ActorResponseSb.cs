using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    /// <summary> Sidebar extended model with top 50 actor movies </summary>
    public sealed record ActorResponseSb(
        string Id,
        string FullName,
        string? Alias,
        DateTime? BirthDate,
        string? Biography,
        string? PhotoUrl,
        Visibility Visibility,
        Sex? Sex,
        List<string> Nationalities,
        List<MediaResponseSlim> Media
        );
}
