using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.Service
{
    public class SeedUserWatchRequest
    {
        public string? UserId { get; set; }
        public Visibility Visibility { get; set; } = Visibility.Private;
        public WatchStatus Status { get; init; } = WatchStatus.Watched;
        public MediaType Type { get; init; } = MediaType.Video;
        public List<string> Tags { get; init; } = [];
        public string? Author { get; set; }
        public string? CollectionId { get; set; }
        public string Payload { get; set; } = "";
    }

    public class SeedActorsRequest
    {
        public string? UserId { get; set; }
        public Visibility Visibility { get; set; } = Visibility.Private;
        public string Payload { get; set; } = "";
    }
}
