using Microsoft.AspNetCore.Mvc;
using MovieJournalBackend.Contracts.Service;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;

namespace MovieJournalBackend.Endpoints
{
    public static class ServiceEndpoints
    {
        public static IEndpointRouteBuilder MapServiceEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/service/status", GetStatusAsync).Produces<string>().AllowAnonymous();
            app.MapGet("/api/service/metadata", GetMetadataAsync).Produces<MetadataResponse>().RequireAnyRole();

            return app;
        }

        private static async Task<IResult> GetStatusAsync(CancellationToken ct)
        {
            return Results.Ok("Alive");
        }

        private static async Task<IResult> GetMetadataAsync([FromQuery] string url, IMetadataService metadataService, CancellationToken ct)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp &&
                 uri.Scheme != Uri.UriSchemeHttps) ||
                !string.IsNullOrEmpty(uri.UserInfo))
            {
                return Results.BadRequest(new { message = "A valid HTTP or HTTPS URL is required." });
            }

            try
            {
                var metadata = await metadataService.GetMetadataAsync(uri, ct);

                return Results.Ok(metadata);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status504GatewayTimeout,
                    title: "The target website timed out.");
            }
            catch (HttpRequestException)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status502BadGateway,
                    title: "Could not retrieve the target website.");
            }
            catch (InvalidOperationException ex)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status502BadGateway,
                    title: ex.Message);
            }
        }
    }
}