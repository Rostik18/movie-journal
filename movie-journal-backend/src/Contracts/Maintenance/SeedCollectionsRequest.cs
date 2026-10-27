using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Maintenance
{
    public class SeedCollectionsRequest
    {
        public string? UserId { get; set; }
        public Visibility Visibility { get; set; } = Visibility.Private;
        public List<string> Tags { get; init; } = [];
        public string Payload { get; set; } = ""; // Name   Description PosterUrl   Tags
    }
}