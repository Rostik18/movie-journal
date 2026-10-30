using MovieJournalBackend.Contracts.Statistic;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Repositories;

namespace MovieJournalBackend.Services.Implementation
{
    public class StatisticService(IActorRepository actorRepository) : IStatisticService
    {
        private const int AgeBlockSize = 5;
        private const int MaxAge = 100;

        public async Task<ActorsStatisticResponse> GetActorsStatisticsAsync(int? ageGap, UserContext user, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var ageBlockSize = ageGap is null or <= 0 ? AgeBlockSize : ageGap.Value;

            var result = new ActorsStatisticResponse
            {
                TotalActors = await actorRepository.GetCountAsync(new(), user, ct),
                MaleActors = await actorRepository.GetCountAsync(new() { Filter = new() { Sex = Sex.Male } }, user, ct),
                FemaleActors = await actorRepository.GetCountAsync(new() { Filter = new() { Sex = Sex.Female } }, user, ct)
            };

            var nationalityCounts = await actorRepository.GetCountByNationalityAsync(user, ct);

            foreach (var (code, count) in nationalityCounts)
                result.CountByNationality[code] = count;

            var ageCounts = await actorRepository.GetCountByAgeAsync(now, MaxAge, ageBlockSize, user, ct);

            foreach (var (ageBlock, count) in ageCounts)
                result.CountByAge[ageBlock.ToString()] = count;

            return result;
        }
    }
}
