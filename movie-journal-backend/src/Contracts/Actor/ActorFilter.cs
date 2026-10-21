using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Actor
{
    public sealed class ActorFilter
    {
        public string? Query { get; init; }
        public bool? HasPhoto { get; init; }
        public int? BirthYear { get; init; }
        public Visibility? Visibility { get; init; }
    }
}
