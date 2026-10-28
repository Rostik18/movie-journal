using MovieJournalBackend.Contracts.Statistic;

namespace MovieJournalBackend.Services
{
    public interface IStatisticService
    {
        Task<ActorsStatisticResponse> GetActorsStatisticsAsync(UserContext user, CancellationToken ct = default);
    }
}
