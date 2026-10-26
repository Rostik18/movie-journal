using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Maintenance
{
    public class SeedActorsRequest
    {
        public string? UserId { get; set; }
        public Visibility Visibility { get; set; } = Visibility.Private;
        public string Payload { get; set; } = "";
    }
}
