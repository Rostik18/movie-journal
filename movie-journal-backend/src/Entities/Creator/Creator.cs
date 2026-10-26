using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Entities.Creator
{
    public class Creator : OwnedEntity
    {
        //Christopher Nolan, Pixar, Kurzgesagt
        public required string Name { get; set; }
        public string NormalizedName { get; set; } = null!;

        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? WebsiteUrl { get; set; }
    }
}
