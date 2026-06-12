using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Repositories.Common
{
    public interface IRepository<TEntity> where TEntity : BaseEntity
    {
        Task<TEntity?> GetByIdAsync(string id, CancellationToken ct = default);
        Task CreateAsync(TEntity entity, CancellationToken ct = default);
        Task UpdateAsync(TEntity entity, CancellationToken ct = default);
        Task DeleteAsync(string id, CancellationToken ct = default);
        Task<bool> Any(CancellationToken ct = default);
    }
}
