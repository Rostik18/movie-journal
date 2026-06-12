using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface IUserWatchingRepository : IRepository<UserWatching>
    {
        Task<long> CountByStatusAsync(string userId, WatchStatus status, CancellationToken ct = default);
        Task<UserWatching?> GetByUserAndMediaAsync(string userId, string mediaId, CancellationToken ct = default);
        Task<Page<UserWatching>> SearchAsync(SearchRequest<UserWatchingFilter, UserWatchingSortField> request, UserContext user, CancellationToken ct = default);
        Task DeleteByUserAndMediaAsync(string userId, string mediaId, CancellationToken ct = default);
    }
}
