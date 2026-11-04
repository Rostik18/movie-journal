using MovieJournalBackend.Contracts.Statistic;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Repositories;

namespace MovieJournalBackend.Services.Implementation
{
    public class StatisticService(
        IActorRepository actorRepository,
        IMediaRepository mediaRepository,
        IUserWatchingRepository userWatchingRepository
        ) : IStatisticService
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

            var monthCounts = await actorRepository.GetCountByMonthAsync(user, ct);

            foreach (var (month, count) in monthCounts)
                result.CountByMonth[month.ToString()] = count;

            return result;
        }

        public async Task<MediaStatisticResponse> GetMediaStatisticsAsync(UserContext user, CancellationToken ct = default)
        {
            var result = new MediaStatisticResponse
            {
                TotalMedia = await mediaRepository.GetCountAsync(new(), user, ct)
            };

            var typeCounts = await mediaRepository.GetCountByTypeAsync(user, ct);

            foreach (var (type, count) in typeCounts)
                result.CountByType[type] = count;

            var yearCounts = await mediaRepository.GetCountByYearAsync(user, ct);

            foreach (var (year, count) in yearCounts)
                result.CountByYear[year.ToString()] = count;

            var decadeCounts = await mediaRepository.GetCountByDecadeAsync(user, ct);

            foreach (var (decade, count) in decadeCounts)
                result.CountByDecade[decade.ToString()] = count;

            var genreCounts = await mediaRepository.GetCountByGenreAsync(user, ct);

            foreach (var (genre, count) in genreCounts)
                result.CountByGenre[genre] = count;

            var tagCounts = await mediaRepository.GetCountByTagAsync(user, ct);

            foreach (var (tag, count) in tagCounts)
                result.CountByTag[tag] = count;

            var (withPoster, withoutPoster) = await mediaRepository.GetPosterStatisticsAsync(user, ct);

            result.CountWithPoster = withPoster;
            result.CountWithoutPoster = withoutPoster;

            return result;
        }

        public async Task<UserWatchingStatisticResponse> GetUserWatchingStatisticsAsync(UserContext user, CancellationToken ct = default)
        {
            var userId = user.UserId;

            var summary = await userWatchingRepository.GetStatisticsSummaryAsync(userId, ct);

            var result = new UserWatchingStatisticResponse
            {
                TotalMedia = summary.TotalMedia,
                AverageRating = summary.AverageRating,
                CompletionRate = summary.CompletionRate,
                DropRate = summary.DropRate
            };

            var statusCounts = await userWatchingRepository.GetCountByStatusAsync(userId, ct);

            foreach (var (status, count) in statusCounts)
                result.CountByStatus[status] = count;

            var typeCounts = await userWatchingRepository.GetCountByTypeAsync(userId, ct);

            foreach (var (type, count) in typeCounts)
                result.CountByType[type] = count;

            var ratingCounts = await userWatchingRepository.GetCountByRatingAsync(userId, ct);

            foreach (var (rating, count) in ratingCounts)
                result.CountByRating[rating] = count;

            var genreCounts = await userWatchingRepository.GetCountByGenreAsync(userId, ct);

            foreach (var (genre, count) in genreCounts)
                result.CountByGenre[genre] = count;

            var startedCounts = await userWatchingRepository.GetCountStartedByMonthAsync(userId, ct);

            foreach (var (month, count) in startedCounts)
                result.CountStartedByMonth[month] = count;

            var finishedCounts = await userWatchingRepository.GetCountFinishedByMonthAsync(userId, ct);

            foreach (var (month, count) in finishedCounts)
                result.CountFinishedByMonth[month] = count;

            return result;
        }
    }
}
