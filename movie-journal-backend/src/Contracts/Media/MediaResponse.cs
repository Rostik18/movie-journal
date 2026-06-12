using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed record MediaResponse(
        string Id,
        string Title,
        string? OriginalTitle,
        MediaType Type,
        int ReleaseYear,
        string? PosterUrl,
        List<string> Genres,
        List<string> Tags
        );
}
