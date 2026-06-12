using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.MediaCollection
{
    public sealed record MediaCollectionResponse(
        string Id,
        string Name,
        string? PosterUrl,
        IReadOnlyList<string> Tags,
        Visibility Visibility);
}
