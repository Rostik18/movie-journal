using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;

namespace MovieJournalBackend.Contracts.Media
{
    public class CreateMediaRequest
    {
        public required string Title { get; init; }
        public string? Description { get; init; }
        public string? OriginalTitle { get; init; }
        public MediaType Type { get; init; }
        public int? ReleaseYear { get; init; }
        public int? Duration { get; init; }
        public string? PosterUrl { get; init; }
        public Visibility Visibility { get; init; }
        public List<string> Genres { get; init; } = [];
        public List<string> Tags { get; init; } = [];
        public List<string> Links { get; init; } = [];
        public List<MediaActor> Cast { get; init; } = [];
        public List<Season> Seasons { get; init; } = [];
        public string? Author { get; init; }
        public string? CollectionId { get; init; }
    }
}
