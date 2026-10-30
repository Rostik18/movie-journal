using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Series
{
    public sealed class UpdateSeriesRequest
    {
        public required string SeriesId { get; init; }
        public string? Title { get; init; }
        public string? OriginalTitle { get; set; }
        public string? Description { get; init; }
        public string? PosterUrl { get; init; }
        public List<string>? Genres { get; init; }
        public List<string>? Tags { get; init; }
        public Visibility? Visibility { get; init; }
    }
}
