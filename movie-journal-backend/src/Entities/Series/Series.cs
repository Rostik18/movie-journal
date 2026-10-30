using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Series
{
    public class Series : OwnedEntity
    {
        public required string Title { get; set; }
        public string NormalizedTitle { get; set; } = null!;
        public string? OriginalTitle { get; set; }

        public string? Description { get; set; }
        public string? PosterUrl { get; set; }

        public List<string> Genres { get; set; } = [];
        public List<string> Tags { get; set; } = [];
    }
}
