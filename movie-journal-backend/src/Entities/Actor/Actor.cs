using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Actor
{
    public class Actor : OwnedEntity
    {
        public required string FullName { get; set; }
        public string NormalizedFullName { get; set; } = null!;
        public DateTime? BirthDate { get; set; }
        public string? Biography { get; set; }
        public string? PhotoUrl { get; set; }
    }
}
