using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.MediaCollection
{
    public sealed class UpdateMediaCollectionRequest
    {
        public required string CollectionId { get; init; }
        public string? Name { get; init; }
        public string? Description { get; init; }
        public string? PosterUrl { get; init; }
        public List<string>? Tags { get; init; }
        public Visibility? Visibility { get; init; }
    }
}
