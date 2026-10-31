using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Media
{
    public class Media : OwnedEntity
    {
        public required string Title { get; set; }
        public string? Description { get; set; }
        public string NormalizedTitle { get; set; } = null!;
        public string? OriginalTitle { get; set; }

        public MediaCreator? Creator { get; set; }

        [BsonRepresentation(BsonType.String)]
        public MediaType Type { get; set; }
        public int? ReleaseYear { get; set; }
        public int? DurationSec { get; set; }
        public string? PosterUrl { get; set; }

        public List<string> Genres { get; set; } = [];
        public List<string> Tags { get; set; } = [];
        public List<string> Links { get; set; } = [];
        public List<MediaActor> Cast { get; set; } = [];

        public EpisodeInfo? EpisodeInfo { get; set; }
        public CollectionReference? Collection { get; set; }
    }
}
