namespace MovieJournalBackend.Contracts.Statistic
{
    public class UserWatchingStatisticResponse
    {
        public long TotalMedia { get; set; }

        public Dictionary<string, long> CountByStatus { get; set; } = [];
        public Dictionary<string, long> CountByType { get; set; } = [];
        public Dictionary<string, long> CountByRating { get; set; } = [];
        public Dictionary<string, long> CountByGenre { get; set; } = [];

        public double? AverageRating { get; set; }
        public double CompletionRate { get; set; }
        public double DropRate { get; set; }

        public Dictionary<string, long> CountStartedByMonth { get; set; } = [];
        public Dictionary<string, long> CountFinishedByMonth { get; set; } = [];
    }
}
