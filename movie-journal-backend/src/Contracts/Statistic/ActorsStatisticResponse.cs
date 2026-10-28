namespace MovieJournalBackend.Contracts.Statistic
{
    public class ActorsStatisticResponse
    {
        public long TotalActors { get; set; }
        public long MaleActors { get; set; }
        public long FemaleActors { get; set; }
        public Dictionary<string, long> CountByNationality { get; set; } = [];
        public Dictionary<string, long> CountByAge { get; set; } = [];
    }
}
