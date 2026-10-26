using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Creator
{
    public sealed record CreatorResponse(
        string Id,
        string Name,
        string? Description,
        string? ImageUrl,
        string? WebsiteUrl,
        Visibility Visibility
        );
}