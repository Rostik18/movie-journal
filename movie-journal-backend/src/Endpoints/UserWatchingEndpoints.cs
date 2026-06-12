using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.UserWatching;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Journal;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class UserWatchingEndpoints
    {
        public static IEndpointRouteBuilder MapUserWatchingEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/user-watching/media/{mediaId}", GetByMediaAsync).RequireAnyRole();
            app.MapGet("/api/user-watching/search", SearchAsync).RequireAnyRole();
            app.MapGet("/api/user-watching/statistics", GetStatisticsAsync).RequireAnyRole();
            app.MapPost("/api/user-watching/", CreateAsync).RequireAnyRole();
            app.MapPut("/api/user-watching/", UpdateAsync).RequireAnyRole();
            app.MapDelete("/api/user-watching/media/{mediaId}", DeleteAsync).RequireAnyRole(); ;

            return app;
        }

        private static async Task<IResult> GetByMediaAsync(
            string mediaId, ClaimsPrincipal principal, IUserWatchingService service, CancellationToken ct)
        {
            var entry = await service.GetByMediaAsync(mediaId, principal.ToUserContext(), ct);

            return entry is null
                ? Results.NotFound()
                : Results.Ok(entry.ToResponse());
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? query,
            [FromQuery] string? mediaId,
            [FromQuery] WatchStatus? status,
            [FromQuery] MediaType? type,
            [FromQuery] int? minRating,
            [FromQuery] int? maxRating,
            [FromQuery] bool? hasRating,
            [FromQuery] bool? hasNotes,
            [FromQuery] DateTime? startedFromUtc,
            [FromQuery] DateTime? startedToUtc,
            [FromQuery] DateTime? finishedFromUtc,
            [FromQuery] DateTime? finishedToUtc,

            [FromQuery] UserWatchingSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            IUserWatchingService service,
            CancellationToken ct)
        {
            var user = principal.ToUserContext();

            var request = new SearchRequest<UserWatchingFilter, UserWatchingSortField>
            {
                Sort = sortBy.HasValue ? new(sortBy.Value, sort ?? SortDirection.Ascending) : null,
                Page = new(offset ?? 0, size ?? 20),
                Filter = new()
                {
                    Query = query,
                    MediaId = mediaId,
                    Status = status,
                    Type = type,
                    MinRating = minRating,
                    MaxRating = maxRating,
                    HasRating = hasRating,
                    HasNotes = hasNotes,
                    StartedFromUtc = startedFromUtc,
                    StartedToUtc = startedToUtc,
                    FinishedFromUtc = finishedFromUtc,
                    FinishedToUtc = finishedToUtc
                }
            };

            var page = await service.SearchAsync(request, user, ct);

            return Results.Ok(page.ToResponse(x => x.ToResponse()));
        }

        private static async Task<IResult> GetStatisticsAsync(
            ClaimsPrincipal principal,
            IUserWatchingService service,
            CancellationToken ct)
        {
            var statistics = await service.GetStatisticsAsync(principal.ToUserContext(), ct);

            return Results.Ok(statistics);
        }

        private static async Task<IResult> CreateAsync(
            CreateUserWatchingRequest request,
            ClaimsPrincipal principal,
            IUserWatchingService service,
            CancellationToken ct)
        {
            var created = await service.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/user-watching/media/{created.MediaId}", created.ToResponse());
        }

        private static async Task<IResult> UpdateAsync(
            UpdateUserWatchingRequest request,
            ClaimsPrincipal principal,
            IUserWatchingService service,
            CancellationToken ct)
        {
            var updated = await service.UpdateAsync(request, principal.ToUserContext(), ct);

            return Results.Ok(updated);
        }

        private static async Task<IResult> DeleteAsync(
            string mediaId,
            ClaimsPrincipal principal,
            IUserWatchingService service,
            CancellationToken ct)
        {
            await service.DeleteAsync(mediaId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
