using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Series;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories.Common;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class SeriesEndpoints
    {
        public static IEndpointRouteBuilder MapSeriesEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/series/{seriesId}", GetByIdAsync).Produces<SeriesResponse>().RequireAnyRole();
            app.MapGet("/api/series/{seriesId}/sidebar", GetByIdSbAsync).Produces<SeriesResponseSb>().RequireAnyRole();
            app.MapGet("/api/series/search", SearchAsync).Produces<Page<SeriesResponse>>().RequireAnyRole();
            app.MapPost("/api/series", CreateAsync).Produces<SeriesResponse>().RequireAnyRole();
            app.MapPut("/api/series", UpdateAsync).Produces<SeriesResponse>().RequireAnyRole();
            app.MapDelete("/api/series/{seriesId}", DeleteAsync).RequireAdmin();

            return app;
        }

        private static async Task<IResult> GetByIdAsync(
            string seriesId,
            ClaimsPrincipal principal,
            ISeriesService seriesService,
            CancellationToken ct)
        {
            var series = await seriesService.GetByIdAsync(seriesId, principal.ToUserContext(), ct);

            return series is null
                ? Results.NotFound()
                : Results.Ok(series.ToResponse());
        }

        private static async Task<IResult> GetByIdSbAsync(string seriesId, ClaimsPrincipal principal, ISeriesService seriesService, IMediaService mediaService, CancellationToken ct)
        {
            var series = await seriesService.GetByIdAsync(seriesId, principal.ToUserContext(), ct);

            if (series is null) return Results.NotFound();

            var mediaPage = await mediaService.SearchAsync(new()
            {
                Page = new(0, 50),
                Filter = new() { SeriesId = seriesId }
            }, principal.ToUserContext(), ct);

            return Results.Ok(series.ToResponseSb([.. mediaPage.Items.OrderBy(x=>x.Episode!.Season).ThenBy(x => x.Episode!.Episode).Select(x => x.ToEpisodeResponse())]));
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? query,
            [FromQuery] string? tag,
            [FromQuery] Visibility? visibility,
            [FromQuery] string? ownerUserId,
            [FromQuery] bool? hasPoster,

            [FromQuery] SeriesSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            ISeriesService seriesService,
            CancellationToken ct)
        {
            var page = await seriesService.SearchAsync(new()
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
            CreateSeriesRequest request,
            ClaimsPrincipal principal,
            ISeriesService seriesService,
            CancellationToken ct)
        {
            var series = await seriesService.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/series/{series.Id}", series.ToResponse());
        }

        private static async Task<IResult> UpdateAsync(
            UpdateSeriesRequest request,
            ClaimsPrincipal principal,
            ISeriesService seriesService,
            CancellationToken ct)
        {
            var series = await seriesService.UpdateAsync(request, principal.ToUserContext(), ct);

            return Results.Ok(series.ToResponse());
        }

        private static async Task<IResult> DeleteAsync(
            string seriesId,
            ClaimsPrincipal principal,
            ISeriesService seriesService,
            CancellationToken ct)
        {
            await seriesService.DeleteAsync(seriesId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
