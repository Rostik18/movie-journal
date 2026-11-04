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
        Task<List<Media>> GetByIdsAsync(string[] mediaIds, CancellationToken ct = default);
        Task<bool> ExistsAsync(string title, UserContext user, CancellationToken ct = default);
        Task ResetCollectionAsync(string collectionId, CancellationToken ct = default);
        Task<bool> HasPrivateMediaInCollectionAsync(string collectionId, CancellationToken ct = default);
        Task<bool> HasPublicMediaUsingActorAsync(string actorId, CancellationToken ct = default);
        Task<bool> HasPublicMediaUsingCreatorAsync(string creatorId, CancellationToken ct = default);

        Task<long> GetCountAsync(SearchRequest<MediaFilter, MediaSortField> request, UserContext user, CancellationToken ct = default);
        Task<Dictionary<string, long>> GetCountByTypeAsync(UserContext user, CancellationToken ct = default);
        Task<Dictionary<int, long>> GetCountByYearAsync(UserContext user, CancellationToken ct = default);
        Task<Dictionary<int, long>> GetCountByDecadeAsync(UserContext user, CancellationToken ct = default);
        Task<Dictionary<string, long>> GetCountByGenreAsync(UserContext user, CancellationToken ct = default);
        Task<Dictionary<string, long>> GetCountByTagAsync(UserContext user, CancellationToken ct = default);
        Task<(long WithPoster, long WithoutPoster)> GetPosterStatisticsAsync(UserContext user, CancellationToken ct = default);
    }
}
