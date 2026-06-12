using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Journal
{
    public class UserWatching : BaseEntity
    {
        public required string UserId { get; set; }
        public required string MediaId { get; set; }
        public string Title { get; set; } = null!;
        public string NormalizedTitle { get; set; } = null!;

        [BsonRepresentation(BsonType.String)]
        public WatchStatus Status { get; set; }
        [BsonRepresentation(BsonType.String)]
        public MediaType Type { get; set; }
        public int? StoppedAtSeconds { get; set; }
        public int? Rating { get; set; }
        public string? Notes { get; set; }
        public DateTime? StartedAtUtc { get; set; }
        public DateTime? FinishedAtUtc { get; set; }

        public int? CurrentSeasonNumber { get; set; }
        public int? CurrentEpisodeNumber { get; set; }

        [BsonIgnore]
        public bool IsCompleted => Status == WatchStatus.Watched;
        [BsonIgnore]
        public bool IsInProgress => Status == WatchStatus.Watching;
        [BsonIgnore]
        public bool IsWishlist => Status == WatchStatus.Wishlist;
    }

    public enum WatchStatus
    {
        Wishlist,
        Watching,
        Watched,
        Dropped
    }
}
