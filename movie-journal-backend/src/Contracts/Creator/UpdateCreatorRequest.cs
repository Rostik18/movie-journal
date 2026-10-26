using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Creator
{
    public sealed class UpdateCreatorRequest
    {
        public required string CreatorId { get; init; }
        public string? Name { get; init; }
        public string? Description { get; init; }
        public string? ImageUrl { get; init; }
        public string? WebsiteUrl { get; init; }
        public Visibility? Visibility { get; init; }
    }
}
