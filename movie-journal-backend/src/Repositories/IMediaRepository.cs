using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface IMediaRepository : IRepository<Media>
    {
        Task<Media?> GetByIdAsync(string id, UserContext user, CancellationToken ct = default);
        Task<Page<Media>> SearchAsync(SearchRequest<MediaFilter, MediaSortField> request, UserContext user, CancellationToken ct = default);
        Task<bool> ExistsAsync(string title, UserContext user, CancellationToken ct = default);
        Task ResetCollectionAsync(string collectionId, CancellationToken ct = default);
        Task<bool> HasPrivateMediaInCollectionAsync(string collectionId, CancellationToken ct = default);
        Task<bool> HasPublicMediaUsingActorAsync(string actorId, CancellationToken ct = default);
    }
}
