using MovieJournalBackend.Contracts.Statistic;

namespace MovieJournalBackend.Services
{
    public interface IStatisticService
    {
        Task<ActorsStatisticResponse> GetActorsStatisticsAsync(int? ageGap, UserContext user, CancellationToken ct = default);
    }
}
