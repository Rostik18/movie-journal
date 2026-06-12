using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    public sealed class UpdateActorRequest
    {
        public required string ActorId { get; init; }
        public string? FullName { get; init; }
        public DateTime? BirthDate { get; init; }
        public string? Biography { get; init; }
        public string? PhotoUrl { get; init; }
        public Visibility? Visibility { get; init; }
    }
}
