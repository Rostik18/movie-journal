using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Media
{
    public class MediaCollection : OwnedEntity
    {
        public required string Name { get; set; }
        public string? Description { get; set; }
        public string? PosterUrl { get; set; }
        public List<string> Tags { get; set; } = [];
    }
}
