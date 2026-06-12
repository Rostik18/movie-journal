using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class MediaCollectionEndpoints
    {
        public static IEndpointRouteBuilder MapMediaCollectionEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/collections/{collectionId}", GetByIdAsync).RequireAnyRole();
            app.MapGet("/api/collections/search", SearchAsync).RequireAnyRole();
            app.MapPost("/api/collections", CreateAsync).RequireAnyRole();
            app.MapPut("/api/collections", UpdateAsync).RequireAnyRole();
            app.MapDelete("/api/collections/{collectionId}", DeleteAsync).RequireAdmin();

            return app;
        }

        private static async Task<IResult> GetByIdAsync(
            string collectionId,
            ClaimsPrincipal principal,
            IMediaCollectionService collectionService,
            CancellationToken ct)
        {
            var collection = await collectionService.GetByIdAsync(collectionId, principal.ToUserContext(), ct);

            return collection is null
                ? Results.NotFound()
                : Results.Ok(collection.ToResponse());
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? query,
            [FromQuery] string? tag,
            [FromQuery] Visibility? visibility,
            [FromQuery] string? ownerUserId,
            [FromQuery] bool? hasPoster,

            [FromQuery] MediaCollectionSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            IMediaCollectionService collectionService,
            CancellationToken ct)
        {
            var page = await collectionService.SearchAsync(new()
            {
                Page = new(offset ?? 0, size ?? 20),
                Sort = sortBy.HasValue ? new(sortBy.Value, sort ?? SortDirection.Ascending) : null,
                Filter = new()
                {
                    Query = query,
                    Tag = tag,
                    Visibility = visibility,
                    OwnerUserId = ownerUserId,
                    HasPoster = hasPoster
                }
            }, principal.ToUserContext(), ct);

            return Results.Ok(page.ToResponse(x => x.ToResponse()));
        }

        private static async Task<IResult> CreateAsync(
            CreateMediaCollectionRequest request,
            ClaimsPrincipal principal,
            IMediaCollectionService collectionService,
            CancellationToken ct)
        {
            var collection = await collectionService.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/collections/{collection.Id}", collection.ToResponse());
        }

        private static async Task<IResult> UpdateAsync(
            UpdateMediaCollectionRequest request,
            ClaimsPrincipal principal,
            IMediaCollectionService collectionService,
            CancellationToken ct)
        {
            var collection = await collectionService.UpdateAsync(request, principal.ToUserContext(), ct);

            return Results.Ok(collection.ToResponse());
        }

        private static async Task<IResult> DeleteAsync(
            string collectionId,
            ClaimsPrincipal principal,
            IMediaCollectionService collectionService,
            CancellationToken ct)
        {
            await collectionService.DeleteAsync(collectionId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
