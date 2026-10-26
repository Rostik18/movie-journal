using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Creator;
using MovieJournalBackend.Entities.Creator;
using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Services
{
    public interface ICreatorService
    {
        Task<Creator?> GetByIdAsync(string creatorId, UserContext user, CancellationToken ct = default);
        Task<Page<Creator>> SearchAsync(SearchRequest<CreatorFilter, CreatorSortField> request, UserContext user, CancellationToken ct = default);
        Task<Creator> CreateAsync(CreateCreatorRequest request, UserContext user, CancellationToken ct = default);
        Task<Creator> UpdateAsync(UpdateCreatorRequest request, UserContext user, CancellationToken ct = default);
        Task DeleteAsync(string creatorId, UserContext user, CancellationToken ct = default);
    }
}
