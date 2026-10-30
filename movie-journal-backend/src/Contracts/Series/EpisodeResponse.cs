namespace MovieJournalBackend.Contracts.Series
{
    public sealed record EpisodeResponse(
        string Id,
        string Title,
        int? ReleaseYear,
        int? Duration,
        string? PosterUrl,
        List<string> Genres,
        List<string> Links,
        int? Season,
        int? Episode
    );
}
