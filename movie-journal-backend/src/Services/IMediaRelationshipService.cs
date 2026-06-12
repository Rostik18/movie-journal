using MovieJournalBackend.Entities.Media;

namespace MovieJournalBackend.Services
{
    public interface IMediaRelationshipService
    {
        Task<Media> AddActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default);
        Task<Media> RemoveActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default);
        Task<Media> AddToCollectionAsync(string mediaId, string collectionId, UserContext user, CancellationToken ct = default);
        Task<Media> RemoveFromCollectionAsync(string mediaId, UserContext user, CancellationToken ct = default);
    }
}
