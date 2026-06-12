using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed class UpdateMediaRequest
    {
        public required string MediaId { get; init; }
        public string? Title { get; init; }
        public string? OriginalTitle { get; init; }
        public int? ReleaseYear { get; init; }
        public int? RuntimeMinutes { get; init; }
        public string? PosterUrl { get; init; }
        public Visibility? Visibility { get; init; }
        public List<string>? Genres { get; init; }
        public List<string>? Tags { get; init; }
        public List<MediaActor>? Cast { get; init; }
        public List<MediaLink>? Links { get; init; }
        public List<Season>? Seasons { get; init; }
        public string? CollectionId { get; init; }
    }
}
