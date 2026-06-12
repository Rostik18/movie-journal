using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MovieJournalBackend.Entities.Base
{
    public abstract class OwnedEntity : BaseEntity
    {
        [BsonRepresentation(BsonType.String)]
        public Visibility Visibility { get; set; }
        public required string OwnerUserId { get; set; }
        public required string CreatedByUserId { get; set; }
        public string? LastModifiedByUserId { get; set; }
    }
}
