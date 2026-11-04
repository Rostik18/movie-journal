namespace MovieJournalBackend.Contracts.Statistic
{
    public class MediaStatisticResponse
    {
        public long TotalMedia { get; set; }

        public Dictionary<string, long> CountByType { get; set; } = [];
        public Dictionary<string, long> CountByYear { get; set; } = [];
        public Dictionary<string, long> CountByDecade { get; set; } = [];
        public Dictionary<string, long> CountByGenre { get; set; } = [];
        public Dictionary<string, long> CountByTag { get; set; } = [];

        public long CountWithPoster { get; set; }
        public long CountWithoutPoster { get; set; }
    }
}
