using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Creator;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class CreatorEndpoints
    {
        public static IEndpointRouteBuilder MapCreatorEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/creators/{creatorId}", GetByIdAsync).Produces<CreatorResponse>().RequireAnyRole();
            app.MapGet("/api/creators/search", SearchAsync).Produces<Page<CreatorResponse>>().RequireAnyRole();
            app.MapPost("/api/creators", CreateAsync).Produces<CreatorResponse>().RequireAnyRole();
            app.MapPut("/api/creators", UpdateAsync).Produces<CreatorResponse>().RequireAnyRole();
            app.MapDelete("/api/creators/{creatorId}", DeleteAsync).RequireAdmin();

            return app;
        }

        private static async Task<IResult> GetByIdAsync(string creatorId, ClaimsPrincipal principal, ICreatorService creatorService, CancellationToken ct)
        {
            var creator = await creatorService.GetByIdAsync(creatorId, principal.ToUserContext(), ct);

            return creator is null
                ? Results.NotFound()
                : Results.Ok(creator.ToResponse());
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? query,
            [FromQuery] bool? hasPhoto,
            [FromQuery] Visibility? visibility,

            [FromQuery] CreatorSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            ICreatorService creatorService,
            CancellationToken ct)
        {
            var page = await creatorService.SearchAsync(new()
            {
                Page = new(offset ?? 0, size ?? 20),
                Sort = sortBy.HasValue ? new(sortBy.Value, sort ?? SortDirection.Ascending) : null,
                Filter = new()
                {
                    Query = query,
                    HasPhoto = hasPhoto,
                    Visibility = visibility,
                }
            }, principal.ToUserContext(), ct);

            return Results.Ok(page.ToResponse(x => x.ToResponse()));
        }

        private static async Task<IResult> CreateAsync(
            CreateCreatorRequest request,
            ClaimsPrincipal principal,
            ICreatorService creatorService,
            CancellationToken ct)
        {
            var creator = await creatorService.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/creators/{creator.Id}", creator.ToResponse());
        }

        private static async Task<IResult> UpdateAsync(
            UpdateCreatorRequest request,
            ClaimsPrincipal principal,
            ICreatorService creatorService,
            CancellationToken ct)
        {
            var creator = await creatorService.UpdateAsync(request, principal.ToUserContext(), ct);

            return Results.Ok(creator.ToResponse());
        }

        private static async Task<IResult> DeleteAsync(
            string creatorId,
            ClaimsPrincipal principal,
            ICreatorService creatorService,
            CancellationToken ct)
        {
            await creatorService.DeleteAsync(creatorId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
