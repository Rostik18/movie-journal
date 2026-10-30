using MovieJournalBackend.Contracts.Maintenance;

namespace MovieJournalBackend.Services
{
    public interface ISeedService
    {
        Task<IResult> SeedActors(SeedActorsRequest request, string userId, CancellationToken ct);
        Task<IResult> SeedCollections(SeedCollectionsRequest request, string userId, CancellationToken ct);
        Task<IResult> SeedCreators(SeedCreatorsRequest request, string userId, CancellationToken ct);
        Task<IResult> SeedSeries(SeedSeriesRequest request, string userId, CancellationToken ct);
        Task<IResult> SeedUserWatch(SeedUserWatchRequest request, string userId, CancellationToken ct);
    }
}
