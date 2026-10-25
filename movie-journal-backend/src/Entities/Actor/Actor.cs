using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Actor
{
    public class Actor : OwnedEntity
    {
        public required string FullName { get; set; }
        public string? Alias { get; set; }
        public string NormalizedFullName { get; set; } = null!;
        public DateTime? BirthDate { get; set; }
        public string? Biography { get; set; }
        public string? PhotoUrl { get; set; }
        public Sex? Sex { get; set; }
        public string? Nationality { get; set; } // ISO 3166-1 alpha-3 country code, e.g., "USA", "GBR", "CUB,ESP"
    }
}
