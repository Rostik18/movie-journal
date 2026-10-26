using MovieJournalBackend.Contracts.Maintenance;

namespace MovieJournalBackend.Services
{
    public interface IMetadataService
    {
        Task<MetadataResponse> GetMetadataAsync(Uri url, CancellationToken ct = default);
    }
}
