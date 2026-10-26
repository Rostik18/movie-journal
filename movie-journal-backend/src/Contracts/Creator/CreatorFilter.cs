using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Creator
{
    public sealed class CreatorFilter
    {
        public string? Query { get; init; }
        public bool? HasPhoto { get; init; }
        public Visibility? Visibility { get; init; }
    }
}
