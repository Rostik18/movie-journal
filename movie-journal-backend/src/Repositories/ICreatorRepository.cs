using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Creator;
using MovieJournalBackend.Entities.Creator;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Repositories
{
    public interface ICreatorRepository : IRepository<Creator>
    {
        Task<Creator?> GetByIdAsync(string creatorId, UserContext user, CancellationToken ct = default);
        Task<Page<Creator>> SearchAsync(SearchRequest<CreatorFilter, CreatorSortField> request, UserContext user, CancellationToken ct = default);
        Task<bool> ExistsAsync(string name, UserContext user, CancellationToken ct = default);
    }
}
