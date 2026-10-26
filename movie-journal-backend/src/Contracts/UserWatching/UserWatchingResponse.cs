using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.UserWatching
{
    public sealed record UserWatchingResponse(
        MediaResponse Media,
        WatchStatus Status,
        int? StoppedAtSeconds,
        int? Rating,
        string? Notes,
        DateTime? StartedAtUtc,
        DateTime? FinishedAtUtc,
        int? CurrentSeasonNumber,
        int? CurrentEpisodeNumber
        );
}
