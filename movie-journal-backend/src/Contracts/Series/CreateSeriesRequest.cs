using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Series
{
    public class CreateSeriesRequest
    {
        public required string Title { get; set; }
        public string? OriginalTitle { get; set; }
        public string? Description { get; set; }
        public string? PosterUrl { get; set; }
        public List<string> Genres { get; init; } = [];
        public List<string> Tags { get; set; } = [];
        public Visibility Visibility { get; init; }
    }
}
