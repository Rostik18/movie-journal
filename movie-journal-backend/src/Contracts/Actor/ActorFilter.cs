namespace MovieJournalBackend.Contracts.Actor
{
    public sealed class ActorFilter
    {
        public string? Name { get; init; }
        public bool? HasPhoto { get; init; }
        public int? BirthYear { get; init; }
    }
}
