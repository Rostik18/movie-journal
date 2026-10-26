using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Creator
{
    public sealed class CreateCreatorRequest
    {
        public required string Name { get; init; }
        public string? Description { get; init; }
        public string? ImageUrl { get; init; }
        public string? WebsiteUrl { get; init; }
        public Visibility Visibility { get; init; }
    }
}
