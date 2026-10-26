using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.UserWatching
{
    public sealed record UserWatchingResponseSlim(
        MediaResponseSlim Media,
        WatchStatus Status,
        int? Rating,
        string? Notes
        );
}
