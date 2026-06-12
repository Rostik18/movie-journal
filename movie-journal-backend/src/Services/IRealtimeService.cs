using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend.Services
{
    public interface IRealtimeService
    {
        Task PublishAsync(string ownerUserId, Visibility visibility, ResourceType ResourceType, EventType EventType, string ResourceId);
    }

    public sealed record RealtimeEvent(ResourceType ResourceType, EventType EventType, string ResourceId, DateTime TimestampUtc);

    public enum ResourceType
    {
        Media,
        Collection,
        Actor,
        UserWatching
    }

    public enum EventType
    {
        Created,
        Updated,
        Deleted
    }
}
