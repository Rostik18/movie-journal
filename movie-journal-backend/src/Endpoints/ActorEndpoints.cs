using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Actor;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class ActorEndpoints
    {
        public static IEndpointRouteBuilder MapActorEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/actors/{actorId}", GetByIdAsync).Produces<ActorResponse>().RequireAnyRole();
            app.MapGet("/api/actors/search", SearchAsync).Produces<Page<ActorResponse>>().RequireAnyRole();
            app.MapPost("/api/actors", CreateAsync).Produces<ActorResponse>().RequireAnyRole();
            app.MapPut("/api/actors", UpdateAsync).Produces<ActorResponse>().RequireAnyRole();
            app.MapDelete("/api/actors/{actorId}", DeleteAsync).RequireAdmin();

            return app;
        }

        private static async Task<IResult> GetByIdAsync(string actorId, ClaimsPrincipal principal, IActorService actorService, CancellationToken ct)
        {
            var actor = await actorService.GetByIdAsync(actorId, principal.ToUserContext(), ct);

            return actor is null
                ? Results.NotFound()
                : Results.Ok(actor.ToResponse());
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? query,
            [FromQuery] int? birthYear,
            [FromQuery] bool? hasPhoto,
            [FromQuery] Visibility? visibility,

            [FromQuery] ActorSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            IActorService actorService,
            CancellationToken ct)
        {
            var page = await actorService.SearchAsync(new()
            {
                Page = new(offset ?? 0, size ?? 20),
                Sort = sortBy.HasValue ? new(sortBy.Value, sort ?? SortDirection.Ascending) : null,
                Filter = new()
                {
                    Query = query,
                    BirthYear = birthYear,
                    HasPhoto = hasPhoto,
                    Visibility = visibility
                }
            }, principal.ToUserContext(), ct);

            return Results.Ok(page.ToResponse(x => x.ToResponse()));
        }

        private static async Task<IResult> CreateAsync(
            CreateActorRequest request,
            ClaimsPrincipal principal,
            IActorService actorService,
            CancellationToken ct)
        {
            var actor = await actorService.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/actors/{actor.Id}", actor.ToResponse());
        }

        private static async Task<IResult> UpdateAsync(
            UpdateActorRequest request,
            ClaimsPrincipal principal,
            IActorService actorService,
            CancellationToken ct)
        {
            var actor = await actorService.UpdateAsync(request, principal.ToUserContext(), ct);

            return Results.Ok(actor.ToResponse());
        }

        private static async Task<IResult> DeleteAsync(
            string actorId,
            ClaimsPrincipal principal,
            IActorService actorService,
            CancellationToken ct)
        {
            await actorService.DeleteAsync(actorId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
