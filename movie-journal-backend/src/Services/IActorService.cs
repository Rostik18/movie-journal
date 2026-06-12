using MovieJournalBackend.Contracts.Actor;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface IActorService
    {
        Task<Actor?> GetByIdAsync(string actorId, UserContext user, CancellationToken ct = default);
        Task<Page<Actor>> SearchAsync(SearchRequest<ActorFilter, ActorSortField> request, UserContext user, CancellationToken ct = default);
        Task<Actor> CreateAsync(CreateActorRequest request, UserContext user, CancellationToken ct = default);
        Task<Actor> UpdateAsync(UpdateActorRequest request, UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string actorId, UserContext user, CancellationToken ct = default);
    }
}
