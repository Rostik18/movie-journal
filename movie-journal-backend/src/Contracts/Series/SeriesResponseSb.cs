using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Series
{
    public sealed record SeriesResponseSb(
        string Id,
        string Name,
        string? Description,
        string? PosterUrl,
        IReadOnlyList<string> Tags,
        Visibility Visibility,
        List<EpisodeResponse> Episodes
        );
}
