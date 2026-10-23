using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.UserWatching
{
    public sealed class UserWatchingResponseSlim
    {
        public required MediaResponseSlim Media { get; init; }
        public WatchStatus Status { get; init; }
        public int? Rating { get; init; }
        public string? Notes { get; init; }
    }
}
