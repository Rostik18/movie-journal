using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.MediaCollection
{
    public sealed record MediaCollectionResponseSb(
        string Id,
        string Name,
        string? Description,
        string? PosterUrl,
        IReadOnlyList<string> Tags,
        Visibility Visibility,
        List<MediaResponseSlim> Media
    );
}
