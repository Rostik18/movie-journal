using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface IMediaService
    {
        Task<Media?> GetByIdAsync(string mediaId, UserContext user, CancellationToken ct = default);
        Task<Page<Media>> SearchAsync(SearchRequest<MediaFilter, MediaSortField> request, UserContext user, CancellationToken ct = default);
        Task<Media> CreateAsync(CreateMediaRequest request, UserContext user, CancellationToken ct = default);
        Task<Media> UpdateAsync(UpdateMediaRequest request, UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string mediaId, UserContext user, CancellationToken ct = default);
    }
}
