using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.UserWatching
{
    public sealed class UserWatchingResponse
    {
        public required MediaResponse Media { get; init; }
        public WatchStatus Status { get; init; }
        public int? StoppedAtSeconds { get; init; }
        public int? Rating { get; init; }
        public string? Notes { get; init; }
        public DateTime? StartedAtUtc { get; init; }
        public DateTime? FinishedAtUtc { get; init; }
        public int? CurrentSeasonNumber { get; init; }
        public int? CurrentEpisodeNumber { get; init; }
    }
}
