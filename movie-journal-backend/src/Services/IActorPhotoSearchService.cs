namespace MovieJournalBackend.Services
{
    public interface IActorPhotoSearchService
    {
        Task<List<ActorPhotoResult>> TrySearchAsync(string actorName, CancellationToken ct = default);
    }

    public record ActorPhotoResult(
        string ImageUrl,
        string SourceUrl,
        string? Author,
        string? License,
        string? LicenseUrl
);
}
