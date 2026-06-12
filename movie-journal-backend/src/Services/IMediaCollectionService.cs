using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface IMediaCollectionService
    {
        Task<MediaCollection?> GetByIdAsync(string collectionId, UserContext user, CancellationToken ct = default);
        Task<Page<MediaCollection>> SearchAsync(SearchRequest<MediaCollectionFilter, MediaCollectionSortField> request, UserContext user, CancellationToken ct = default);
        Task<MediaCollection> CreateAsync(CreateMediaCollectionRequest request, UserContext user, CancellationToken ct = default);
        Task<MediaCollection> UpdateAsync(UpdateMediaCollectionRequest request, UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string collectionId, UserContext user, CancellationToken ct = default);
    }
}
