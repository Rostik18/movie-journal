using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed class MediaFilter
    {
        public string? Query { get; init; }
        public MediaType? Type { get; init; }
        public Visibility? Visibility { get; init; }
        public int? ReleaseYear { get; init; }
        public string? Genre { get; init; }
        public string? Tag { get; init; }
        public string? CollectionId { get; init; }
        public string? ActorId { get; init; }
        public string? Creator { get; init; }
        public string? CreatorId { get; init; }
        public string? SeriesId { get; init; }
    }
}
