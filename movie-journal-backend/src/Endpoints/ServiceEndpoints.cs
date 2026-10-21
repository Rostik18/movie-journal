using Microsoft.AspNetCore.Mvc;
using MovieJournalBackend.Contracts.Service;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;
using System.Security.Claims;
using System.Text.Json;

namespace MovieJournalBackend.Endpoints
{
    public static class ServiceEndpoints
    {
        public static IEndpointRouteBuilder MapServiceEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/service/status", GetStatusAsync).Produces<string>().AllowAnonymous();
            app.MapGet("/api/service/metadata", GetMetadataAsync).Produces<MetadataResponse>().RequireAnyRole();
            app.MapPost("/api/service/seed", SeedAsync).Produces<string>().AllowAnonymous();
            app.MapGet("/api/service/database/backup", GetBackup).Produces<Stream>().RequireAdmin();
            app.MapPost("/api/service/database/restore", RestoreAsync).DisableAntiforgery().Produces<object>().RequireAdmin();
            app.MapDelete("/api/service/database/clear", DropCollectionsAsync).Produces<object>().RequireAdmin();

            return app;
        }

        private static async Task<IResult> GetStatusAsync(CancellationToken ct) => Results.Ok("Alive");

        private static async Task<IResult> GetMetadataAsync([FromQuery] string url, IMetadataService metadataService, CancellationToken ct)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                uri.Scheme != Uri.UriSchemeHttps ||
                string.IsNullOrWhiteSpace(uri.Host) ||
                !string.IsNullOrEmpty(uri.UserInfo) ||
                !string.IsNullOrEmpty(uri.Fragment))
            {
                return Results.BadRequest(new { message = "A valid HTTPS URL is required." });
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

        private static async Task<IResult> SeedAsync(
            SeedRequest request,
            ClaimsPrincipal principal,
            IMetadataService metadataService,
            IMediaService mediaService,
            IUserWatchingService uwService,
            CancellationToken ct)
        {
            if (string.IsNullOrEmpty(request.Payload)) return Results.Ok("No payload");

            var userId = request.UserId ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var parsedPayload = Parse(request.Payload);

            foreach (var parsedItem in parsedPayload)
            {
                try
                {
                    if (!Uri.TryCreate(parsedItem.Url, UriKind.Absolute, out var uri) ||
                        string.IsNullOrWhiteSpace(uri.Host) ||
                        !string.IsNullOrEmpty(uri.UserInfo) ||
                        !string.IsNullOrEmpty(uri.Fragment))
                    {
                        continue;
                    }

                    var metadata = await metadataService.GetMetadataAsync(uri, ct);

                    var media = await mediaService.CreateAsync(new()
                    {
                        Title = metadata.Title ?? parsedItem.Name ?? "",
                        OriginalTitle = metadata.Title ?? parsedItem.Name ?? "",
                        Description = metadata.Description,
                        Author = metadata.Author ?? request.Author,
                        Type = metadata.Type ?? request.Type,
                        Visibility = request.Visibility,
                        PosterUrl = metadata.Image,
                        Tags = metadata.Tags.Concat(request.Tags).Distinct().ToList() ?? [],
                        RuntimeMinutes = metadata.DurationSeconds / 60,
                        ReleaseYear = metadata.PublishedAtUtc?.Year,
                        Links = [new() { Url = parsedItem.Url, Type = MediaLinkType.Other }],
                    }, new(userId!, [UserRole.Admin]), ct);

                    var created = await uwService.CreateAsync(new()
                    {
                        MediaId = media.Id,
                        Rating = parsedItem.Rate,
                        Status = request.Status
                    }, principal.ToUserContext(), ct);
                }
                catch
                {
                    continue;
                }
            }

            return Results.Ok("Done");
        }

        private static async Task<IResult> GetBackup(IDatabaseBackupService backupService, HttpContext context, CancellationToken ct)
        {
            var fileName = $"movie-journal-backup-{DateTime.UtcNow:yyyy-MM-dd-HHmmss}.zip";
            var tempPath = Path.Combine(Path.GetTempPath(), $"movie-journal-{Guid.NewGuid():N}.zip");

            try
            {
                await backupService.ExportToFileAsync(tempPath, ct);

                context.Response.OnCompleted(() =>
                {
                    try { File.Delete(tempPath); } catch { }

                    return Task.CompletedTask;
                });

                var stream = new FileStream(
                    tempPath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.Read,
                    bufferSize: 81920,
                    options: FileOptions.Asynchronous |
                             FileOptions.SequentialScan);

                return Results.Stream(
                    stream,
                    contentType: "application/zip",
                    fileDownloadName: fileName);
            }
            catch
            {
                try { File.Delete(tempPath); } catch { }

                throw;
            }
        }

        private static async Task<IResult> RestoreAsync([FromForm] RestoreBackupRequest request, IDatabaseBackupService service, CancellationToken ct)
        {
            var file = request.File;

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { Message = "Please provide a non-empty ZIP file in the 'file' field." });
            }

            if (!string.Equals(Path.GetExtension(file.FileName), ".zip", StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(new { Message = "Only ZIP backup files are supported." });
            }

            try
            {
                await using var stream = file.OpenReadStream();

                var result = await service.RestoreAsync(stream, ct);

                return Results.Ok(result);
            }
            catch (InvalidDataException ex)
            {
                return Results.BadRequest(new { ex.Message });
            }
            catch (JsonException)
            {
                return Results.BadRequest(new { Message = "The backup manifest contains invalid JSON." });
            }
            catch (FormatException)
            {
                return Results.BadRequest(new { Message = "The backup contains an invalid BSON/JSON document." });
            }
        }

        private static async Task<IResult> DropCollectionsAsync(IDatabaseBackupService service, CancellationToken ct) =>
            Results.Ok(await service.ClearDbAsync(ct));

        private record UrlNameRate(string Url, string? Name, int? Rate);

        private static UrlNameRate[] Parse(string text) =>
        [.. text
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split('\t', StringSplitOptions.TrimEntries))
            .Select(columns => new UrlNameRate(
                Url: columns[0],
                Name: columns.Length > 1 && !string.IsNullOrWhiteSpace(columns[1])
                    ? columns[1]
                    : null,
                Rate: columns.Length > 2 &&
                        int.TryParse(columns[2], out var rate)
                    ? rate
                    : null))
        ];
    }
}