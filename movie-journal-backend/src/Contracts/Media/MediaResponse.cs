using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed record MediaResponse(
        string Id,
        string Title,
        string? Description,
        string? OriginalTitle,
        MediaType Type,
        int ReleaseYear,
        string? PosterUrl,
        string? Author,
        List<string> Genres,
        List<string> Tags
        );
}
