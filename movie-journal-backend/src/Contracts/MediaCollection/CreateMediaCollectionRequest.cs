using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.MediaCollection
{
    public class CreateMediaCollectionRequest
    {
        public required string Name { get; set; }
        public string? Description { get; set; }
        public string? PosterUrl { get; set; }
        public List<string> Tags { get; set; } = [];
        public Visibility Visibility { get; init; }
    }
}
