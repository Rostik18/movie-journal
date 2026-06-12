using MongoDB.Bson.Serialization.Attributes;

namespace MovieJournalBackend.Entities.Base
{
    public abstract class BaseEntity
    {
        [BsonId]
        public string Id { get; set; } = Guid.CreateVersion7().ToString();

        public DateTime CreatedAtUtc { get; set; }

        public DateTime UpdatedAtUtc { get; set; }
    }
}
