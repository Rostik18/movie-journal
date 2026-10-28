using MovieJournalBackend.Contracts.Actor;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface IActorRepository : IRepository<Actor>
    {
        Task<Actor?> GetByIdAsync(string actorId, UserContext user, CancellationToken ct = default);
        Task<List<Actor>> GetByIdsAsync(string[] actorIds, CancellationToken ct = default);
        Task<Page<Actor>> SearchAsync(SearchRequest<ActorFilter, ActorSortField> request, UserContext user, CancellationToken ct = default);
        Task<List<string>> GetCountryCodesAsync(CancellationToken ct = default);
        Task<bool> ExistsAsync(string fullName, UserContext user, CancellationToken ct = default);
        Task<bool> HasPrivateActorsAsync(IEnumerable<string> actorIds, CancellationToken ct = default);

        Task<long> GetCountAsync(SearchRequest<ActorFilter, ActorSortField> request, UserContext user, CancellationToken ct = default);

        Task<Dictionary<string, long>> GetCountByNationalityAsync(UserContext user, CancellationToken ct = default);
        Task<Dictionary<int, long>> GetCountByBirthYearAsync(int fromYear, int toYear, UserContext user, CancellationToken ct = default);
    }
}
