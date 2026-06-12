using MongoDB.Driver;
using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Repositories.Common
{
    public class BaseRepository<TEntity>(
        IMongoDatabase database,
        string collectionName
        ) : IRepository<TEntity> where TEntity : BaseEntity
    {
        protected readonly IMongoCollection<TEntity> Collection = database.GetCollection<TEntity>(collectionName);
        protected readonly FilterDefinitionBuilder<TEntity> _fBuilder = Builders<TEntity>.Filter;
        protected readonly SortDefinitionBuilder<TEntity> _sBuilder = Builders<TEntity>.Sort;

        public virtual Task<TEntity?> GetByIdAsync(string id, CancellationToken ct = default)
        {
            return Collection.Find(x => x.Id == id).FirstOrDefaultAsync(ct)!;
        }

        public virtual Task CreateAsync(TEntity entity, CancellationToken ct = default)
        {
            entity.CreatedAtUtc = DateTime.UtcNow;
            entity.UpdatedAtUtc = DateTime.UtcNow;

            return Collection.InsertOneAsync(entity, cancellationToken: ct);
        }

        public virtual Task UpdateAsync(TEntity entity, CancellationToken ct = default)
        {
            entity.UpdatedAtUtc = DateTime.UtcNow;

            return Collection.ReplaceOneAsync(x => x.Id == entity.Id, entity, cancellationToken: ct);
        }

        public virtual Task DeleteAsync(string id, CancellationToken ct = default) =>
            Collection.DeleteOneAsync(x => x.Id == id, ct);

        public virtual Task<bool> Any(CancellationToken ct = default) => Collection.Find(_ => true).Limit(1).AnyAsync(ct);
    }
}
