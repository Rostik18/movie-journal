using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.UserWatching
{
    public sealed class CreateUserWatchingRequest
    {
        public required string MediaId { get; init; }
        public WatchStatus Status { get; init; }
        public int? Rating { get; init; }
        public string? Notes { get; init; }
        public int? StoppedAtSeconds { get; init; }
        public int? CurrentSeasonNumber { get; init; }
        public int? CurrentEpisodeNumber { get; init; }
    }
}
