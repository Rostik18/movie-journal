using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Series
{
    public sealed record SeriesResponse(
        string Id,
        string Title,
        string? Description,
        string? PosterUrl,
        IReadOnlyList<string> Tags,
        Visibility Visibility);
}
