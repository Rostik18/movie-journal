using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface IMediaCollectionRepository : IRepository<MediaCollection>
    {
        Task<Page<MediaCollection>> SearchAsync(SearchRequest<MediaCollectionFilter, MediaCollectionSortField> request, UserContext user, CancellationToken ct = default);
        Task<MediaCollection?> GetByIdAsync(string id, UserContext user, CancellationToken ct = default);
        Task<bool> ExistsAsync(string name, UserContext user, CancellationToken ct = default);
        Task<List<MediaCollection>> GetByOwnerAsync(string ownerUserId, CancellationToken ct = default);
        Task<MediaCollection?> GetByNameAsync(string name, string ownerUserId, CancellationToken ct = default);
    }
}
