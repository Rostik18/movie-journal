namespace MovieJournalBackend.Entities.Media
{
    public class EpisodeInfo
    {
        public required string SeriesId { get; set; }
        public int? Season { get; set; }
        public int? Episode { get; set; }
    }
}
