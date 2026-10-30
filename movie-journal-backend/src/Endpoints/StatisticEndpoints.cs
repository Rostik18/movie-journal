using Microsoft.AspNetCore.Mvc;
using MovieJournalBackend.Contracts.Statistic;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class StatisticEndpoints
    {
        public static IEndpointRouteBuilder MapStatisticEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/statistics/actors", GetActorsStatisticsAsync).Produces<ActorsStatisticResponse>().RequireAnyRole();

            return app;
        }

        private static async Task<IResult> GetActorsStatisticsAsync(
            [FromQuery] int? ageGap,
            ClaimsPrincipal principal,
            IStatisticService service,
            CancellationToken ct)
        {
            var statistics = await service.GetActorsStatisticsAsync(ageGap, principal.ToUserContext(), ct);

            return Results.Ok(statistics);
        }
    }
}
