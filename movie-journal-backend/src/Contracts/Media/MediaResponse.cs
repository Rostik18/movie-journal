using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed record MediaResponse(
        string Id,
        string Title,
        string? Description,
        string? OriginalTitle,
        MediaType Type,
        int? ReleaseYear,
        int? Duration,
        string? PosterUrl,
        string? Author,
        List<string> Genres,
        List<string> Tags,
        List<string> Links,
        List<CastResponse> Cast,
        Visibility Visibility
        );
}
