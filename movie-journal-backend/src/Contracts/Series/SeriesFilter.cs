using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Series
{
    public sealed class SeriesFilter
    {
        public string? Query { get; init; }
        public string? Tag { get; init; }
        public Visibility? Visibility { get; init; }
        public string? OwnerUserId { get; init; }
        public bool? HasPoster { get; init; }
    }
}
