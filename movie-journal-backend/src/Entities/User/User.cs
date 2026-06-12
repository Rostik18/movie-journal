using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.User
{
    public class User : BaseEntity
    {
        public required string Login { get; set; }
        public string? DisplayName { get; set; }

        [BsonRepresentation(BsonType.String)]
        public List<UserRole> Roles { get; set; } = [UserRole.User];

        public required string PasswordHash { get; set; }
    }
}
