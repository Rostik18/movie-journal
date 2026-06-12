using MongoDB.Driver;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Entities.User;

namespace MovieJournalBackend.Repositories.Common
{
    public class MongoDbIndexInitializer(IMongoDatabase _database)
    {
        public async Task InitializeAsync(CancellationToken ct = default)
        {
            await CreateActorIndexes(ct);
            await CreateUserIndexes(ct);
            await CreateMediaIndexes(ct);
            await CreateMediaCollectionIndexes(ct);
            await CreateUserWatchingIndexes(ct);
        }

        private async Task CreateActorIndexes(CancellationToken ct)
        {
            var collection = _database.GetCollection<Actor>("actors");

            await collection.Indexes.CreateOneAsync(new CreateIndexModel<Actor>(Builders<Actor>.IndexKeys.Ascending(x => x.NormalizedFullName)), cancellationToken: ct);

            await CreateOwnerIndex(collection, ct);
        }

        private async Task CreateUserIndexes(CancellationToken ct)
        {
            var collection = _database.GetCollection<User>("users");

            await collection.Indexes.CreateOneAsync(
                new CreateIndexModel<User>(Builders<User>.IndexKeys.Ascending(x => x.Login),
                new CreateIndexOptions { Unique = true }),
                cancellationToken: ct);
        }

        private async Task CreateMediaIndexes(CancellationToken ct)
        {
            var collection = _database.GetCollection<Media>("media");

            await collection.Indexes.CreateOneAsync(new CreateIndexModel<Media>(Builders<Media>.IndexKeys.Ascending(x => x.NormalizedTitle)), cancellationToken: ct);
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<Media>(Builders<Media>.IndexKeys.Ascending(x => x.Collection!.Id)), cancellationToken: ct);
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<Media>(Builders<Media>.IndexKeys.Ascending(x => x.NormalizedAuthor)), cancellationToken: ct);

            await CreateOwnerIndex(collection, ct);
        }

        private async Task CreateMediaCollectionIndexes(CancellationToken ct)
        {
            var collection = _database.GetCollection<MediaCollection>("mediaCollections");

            await collection.Indexes.CreateOneAsync(new CreateIndexModel<MediaCollection>(Builders<MediaCollection>.IndexKeys.Ascending(x => x.Name)), cancellationToken: ct);

            await CreateOwnerIndex(collection, ct);
        }

        private async Task CreateUserWatchingIndexes(CancellationToken ct)
        {
            var collection = _database.GetCollection<UserWatching>("userWatching");

            await collection.Indexes.CreateOneAsync(new CreateIndexModel<UserWatching>(Builders<UserWatching>.IndexKeys.Ascending(x => x.UserId).Ascending(x => x.MediaId), new CreateIndexOptions { Unique = true }), cancellationToken: ct);
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<UserWatching>(Builders<UserWatching>.IndexKeys.Ascending(x => x.UserId).Ascending(x => x.NormalizedTitle)), cancellationToken: ct);
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<UserWatching>(Builders<UserWatching>.IndexKeys.Ascending(x => x.UserId).Ascending(x => x.Status)), cancellationToken: ct);
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<UserWatching>(Builders<UserWatching>.IndexKeys.Ascending(x => x.UserId).Ascending(x => x.Type)), cancellationToken: ct);
        }

        private static async Task CreateOwnerIndex<T>(IMongoCollection<T> collection, CancellationToken ct) where T : OwnedEntity
        {
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<T>(Builders<T>.IndexKeys.Ascending(x => x.Visibility)), cancellationToken: ct);
            await collection.Indexes.CreateOneAsync(new CreateIndexModel<T>(Builders<T>.IndexKeys.Ascending(x => x.OwnerUserId)), cancellationToken: ct);
        }
    }
}
