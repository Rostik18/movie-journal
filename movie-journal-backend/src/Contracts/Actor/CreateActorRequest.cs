using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    public sealed class CreateActorRequest
    {
        public required string FullName { get; init; }
        public string? Alias { get; init; }
        public DateTime? BirthDate { get; init; }
        public string? Biography { get; init; }
        public string? PhotoUrl { get; init; }
        public Visibility Visibility { get; init; }
        public Sex? Sex { get; init; }
        public List<string> Nationalities { get; init; } = [];
    }
}
