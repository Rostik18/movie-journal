using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface IUserWatchingService
    {
        Task<UserWatchingResponse?> GetByMediaAsync(string mediaId, UserContext user, CancellationToken ct = default);
        Task<Page<UserWatchingResponse>> SearchAsync(SearchRequest<UserWatchingFilter, UserWatchingSortField> request, UserContext user, CancellationToken ct = default);
        Task<UserWatchingResponse> CreateAsync(CreateUserWatchingRequest request, UserContext user, CancellationToken ct = default);
        Task<UserWatchingResponse> UpdateAsync(UpdateUserWatchingRequest request, UserContext user, UserWatching? existingEntity = null, CancellationToken ct = default);
        Task<long> CountByStatusAsync(WatchStatus status, UserContext user, CancellationToken ct = default);
        Task<Dictionary<WatchStatus, long>> GetStatisticsAsync(UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string mediaId, UserContext user, CancellationToken ct = default);
    }
}
