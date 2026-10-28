using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Maintenance
{
    public class SeedUserWatchRequest
    {
        public string? UserId { get; set; }
        public Visibility Visibility { get; set; } = Visibility.Private;
        public List<string> Tags { get; init; } = [];
        public string? CollectionId { get; set; }
        public string Payload { get; set; } = "";
    }
}
