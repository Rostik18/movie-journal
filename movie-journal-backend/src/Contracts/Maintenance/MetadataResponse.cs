using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;

namespace MovieJournalBackend.Contracts.Maintenance
{
    public sealed record MetadataResponse(
        string? Title,
        string? Description,
        string? Image,
        int? DurationSeconds,
        string? Author,
        DateTime? PublishedAtUtc,
        string[] Tags,
        MediaLink? Link,
        int? PlayerWidth,
        int? PlayerHeight);
}
