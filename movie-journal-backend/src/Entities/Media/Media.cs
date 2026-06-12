using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Media
{
    public class Media : OwnedEntity
    {
        public required string Title { get; set; }
        public string NormalizedTitle { get; set; } = null!;
        public string? OriginalTitle { get; set; }

        public string? Author { get; set; }
        public string? NormalizedAuthor { get; set; }

        [BsonRepresentation(BsonType.String)]
        public MediaType Type { get; set; }
        public int ReleaseYear { get; set; }
        public int? RuntimeMinutes { get; set; }
        public string? PosterUrl { get; set; }

        public List<string> Genres { get; set; } = [];
        public List<string> Tags { get; set; } = [];
        public List<MediaActor> Cast { get; set; } = [];
        public List<MediaLink> Links { get; set; } = [];

        public List<Season> Seasons { get; set; } = [];

        public CollectionReference? Collection { get; set; }
    }

    public class Season
    {
        public int Number { get; set; }
        public List<Episode> Episodes { get; set; } = [];
    }

    public class Episode
    {
        public int Number { get; set; }
        public string? Title { get; set; }
    }

    public class MediaLink
    {
        public required string Name { get; set; }
        public required string Url { get; set; }
        public MediaLinkType Type { get; set; }
    }
}
