using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Journal;

namespace MovieJournalBackend.Contracts.UserWatching
{
    public sealed class UserWatchingFilter
    {
        public string? Query { get; init; }
        public string? MediaId { get; init; }
        public WatchStatus? Status { get; init; }
        public MediaType? Type { get; init; }
        public int? MinRating { get; init; }
        public int? MaxRating { get; init; }
        public bool? HasRating { get; init; }
        public bool? HasNotes { get; init; }
        public DateTime? StartedFromUtc { get; init; }
        public DateTime? StartedToUtc { get; init; }
        public DateTime? FinishedFromUtc { get; init; }
        public DateTime? FinishedToUtc { get; init; }
    }
}
