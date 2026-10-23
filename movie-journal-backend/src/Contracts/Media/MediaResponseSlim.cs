using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed record MediaResponseSlim(
       string Id,
       string Title,
       MediaType Type,
       int? ReleaseYear,
       int? Duration,
       string? PosterUrl,
       List<string> Genres,
       List<string> Links,
       Visibility Visibility);
}
