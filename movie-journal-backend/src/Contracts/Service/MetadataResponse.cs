using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Service
{
    public sealed record MetadataResponse(
        string? Title,
        string? Description,
        string? Image,
        int? DurationSeconds,
        string? Author,
        DateTime? PublishedAtUtc,
        MediaType? Type,
        string[] Tags);
}
