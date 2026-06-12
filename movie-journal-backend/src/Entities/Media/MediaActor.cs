namespace MovieJournalBackend.Entities.Media
{
    public class MediaActor
    {
        public required string ActorId { get; set; }

        public required string FullName { get; set; }

        public string? CharacterName { get; set; }
    }
}
