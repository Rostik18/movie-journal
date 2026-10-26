using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Creator
{
    public sealed record CreatorResponseSb(
        string Id,
        string Name,
        string? Description,
        string? ImageUrl,
        string? WebsiteUrl,
        Visibility Visibility,
        List<MediaResponseSlim> Media
        );
}