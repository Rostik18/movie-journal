using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.MediaCollection
{
    public sealed class MediaCollectionFilter
    {
        public string? Query { get; init; }
        public string? Tag { get; init; }
        public Visibility? Visibility { get; init; }
        public string? OwnerUserId { get; init; }
        public bool? HasPoster { get; init; }
    }
}
