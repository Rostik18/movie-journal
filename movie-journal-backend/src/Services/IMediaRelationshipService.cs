using MovieJournalBackend.Contracts.Media;

namespace MovieJournalBackend.Services
{
    public interface IMediaRelationshipService
    {
        Task<MediaResponse> AddActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default);
        Task<MediaResponse> RemoveActorAsync(string mediaId, string actorId, UserContext user, CancellationToken ct = default);
        Task<MediaResponse> AddToCollectionAsync(string mediaId, string collectionId, UserContext user, CancellationToken ct = default);
        Task<MediaResponse> RemoveFromCollectionAsync(string mediaId, UserContext user, CancellationToken ct = default);
    }
}
