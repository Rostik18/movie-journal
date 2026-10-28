using MovieJournalBackend.Contracts.Statistic;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Repositories;

namespace MovieJournalBackend.Services.Implementation
{
    public class StatisticService(IActorRepository actorRepository) : IStatisticService
    {
        private const int AgeBlockSize = 5;
        private const int MaxAge = 100;

        public async Task<ActorsStatisticResponse> GetActorsStatisticsAsync(UserContext user, CancellationToken ct = default)
        {
            var currentYear = DateTime.UtcNow.Year;

            var result = new ActorsStatisticResponse
            {
                TotalActors = await actorRepository.GetCountAsync(new(), user, ct),
                MaleActors = await actorRepository.GetCountAsync(new() { Filter = new() { Sex = Sex.Male } }, user, ct),
                FemaleActors = await actorRepository.GetCountAsync(new() { Filter = new() { Sex = Sex.Female } }, user, ct)
            };

            var nationalityCounts = await actorRepository.GetCountByNationalityAsync(user, ct);

            foreach (var (code, count) in nationalityCounts)
                result.CountByNationality[code] = count;

            var birthYearCounts = await actorRepository.GetCountByBirthYearAsync(currentYear - MaxAge, currentYear, user, ct);

            foreach (var (birthYear, count) in birthYearCounts)
            {
                var age = currentYear - birthYear;
                var ageBlock = age / AgeBlockSize * AgeBlockSize;

                result.CountByAge.TryGetValue(ageBlock.ToString(), out var currentCount);
                result.CountByAge[ageBlock.ToString()] = currentCount + count;
            }

            return result;
        }
    }
}
