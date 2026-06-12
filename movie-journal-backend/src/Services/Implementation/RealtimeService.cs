using Microsoft.AspNetCore.SignalR;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Hubs;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class RealtimeService(
        IHubContext<UserHub> _hub
        ) : IRealtimeService
    {
        public Task PublishAsync(string ownerUserId, Visibility visibility, ResourceType resourceType, EventType eventType, string resourceId)
        {
            var evt = new RealtimeEvent(resourceType, eventType, resourceId, DateTime.UtcNow);

            return visibility == Visibility.Public
                ? _hub.Clients.All.SendAsync("RealtimeEvent", evt)
                : _hub.Clients.Group($"user:{ownerUserId}").SendAsync("RealtimeEvent", evt);
        }
    }
}
