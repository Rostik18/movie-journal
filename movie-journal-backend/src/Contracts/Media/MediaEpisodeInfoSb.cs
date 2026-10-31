namespace MovieJournalBackend.Contracts.Media
{
    public sealed record MediaEpisodeInfoSb(
        string SeriesId,
        string SeriesTitle,
        string? PosterUrl,
        int? Season,
        int? Episode
        );
}
