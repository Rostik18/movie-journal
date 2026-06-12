using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class MediaEndpoints
    {
        public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapPost("/api/media", CreateAsync).RequireAnyRole();
            app.MapGet("/api/media/{mediaId}", GetByIdAsync).RequireAnyRole();
            app.MapGet("/api/media/search", SearchAsync).RequireAnyRole();
            app.MapPut("/api/media", UpdateAsync).RequireAnyRole();
            app.MapDelete("/api/media/{mediaId}", DeleteAsync).RequireAnyRole();

            app.MapPost("/api/media/{mediaId}/actors/{actorId}", AddActorAsync).RequireAnyRole();
            app.MapDelete("/api/media/{mediaId}/actors/{actorId}", RemoveActorAsync).RequireAnyRole();
            app.MapPost("/api/media/{mediaId}/collection/{collectionId}", AddToCollectionAsync).RequireAnyRole();
            app.MapDelete("/api/media/{mediaId}/collection", RemoveFromCollectionAsync).RequireAnyRole();

            return app;
        }

        private static async Task<IResult> RemoveFromCollectionAsync(
            string mediaId, ClaimsPrincipal principal, IMediaRelationshipService mediaService, CancellationToken ct)
        {
            var media = await mediaService.RemoveFromCollectionAsync(mediaId, principal.ToUserContext(), ct);

            return media is null
                ? Results.NotFound()
                : Results.Ok(media);
        }

        private static async Task<IResult> AddToCollectionAsync(
            string mediaId, string collectionId, ClaimsPrincipal principal, IMediaRelationshipService mediaService, CancellationToken ct)
        {
            var media = await mediaService.AddToCollectionAsync(mediaId, collectionId, principal.ToUserContext(), ct);

            return media is null
                ? Results.NotFound()
                : Results.Ok(media);
        }

        private static async Task<IResult> RemoveActorAsync(
            string mediaId, string actorId, ClaimsPrincipal principal, IMediaRelationshipService mediaService, CancellationToken ct)
        {
            var media = await mediaService.RemoveActorAsync(mediaId, actorId, principal.ToUserContext(), ct);

            return media is null
                ? Results.NotFound()
                : Results.Ok(media);
        }

        private static async Task<IResult> AddActorAsync(
            string mediaId, string actorId, ClaimsPrincipal principal, IMediaRelationshipService mediaService, CancellationToken ct)
        {
            var media = await mediaService.AddActorAsync(mediaId, actorId, principal.ToUserContext(), ct);

            return media is null
                ? Results.NotFound()
                : Results.Ok(media);
        }

        private static async Task<IResult> GetByIdAsync(
            string mediaId,
            ClaimsPrincipal principal,
            IMediaService mediaService,
            CancellationToken ct)
        {
            var media = await mediaService.GetByIdAsync(mediaId, principal.ToUserContext(), ct);

            return media is null
                ? Results.NotFound()
                : Results.Ok(media);
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? title,
            [FromQuery] MediaType? type,
            [FromQuery] Visibility? visibility,
            [FromQuery] int? releaseYear,
            [FromQuery] string? genre,
            [FromQuery] string? tag,
            [FromQuery] string? collectionId,
            [FromQuery] string? actorId,
            [FromQuery] string? author,

            [FromQuery] MediaSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            IMediaService mediaService,
            CancellationToken ct)
        {
            var page = await mediaService.SearchAsync(new()
            {
                Page = new(offset ?? 0, size ?? 20),
                Sort = sortBy.HasValue ? new(sortBy.Value, sort ?? SortDirection.Ascending) : null,
                Filter = new()
                {
                    Title = title,
                    Type = type,
                    Visibility = visibility,
                    ReleaseYear = releaseYear,
                    Genre = genre,
                    Tag = tag,
                    CollectionId = collectionId,
                    ActorId = actorId,
                    Author = author
                }
            }, principal.ToUserContext(), ct);

            return Results.Ok(page.ToResponse(x => x.ToResponse()));
        }

        private static async Task<IResult> CreateAsync(
            CreateMediaRequest request,
            ClaimsPrincipal principal,
            IMediaService mediaService,
            CancellationToken ct)
        {
            var media = await mediaService.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/media/{media.Id}", media);
        }

        private static async Task<IResult> UpdateAsync(
            UpdateMediaRequest request,
            ClaimsPrincipal principal,
            IMediaService mediaService,
            CancellationToken ct)
        {
            var media = await mediaService.UpdateAsync(request, principal.ToUserContext(), ct);

            return media is null
                ? Results.NotFound()
                : Results.Ok(media);
        }

        private static async Task<IResult> DeleteAsync(
            string mediaId,
            ClaimsPrincipal principal,
            IMediaService mediaService,
            CancellationToken ct)
        {
            await mediaService.DeleteAsync(mediaId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
