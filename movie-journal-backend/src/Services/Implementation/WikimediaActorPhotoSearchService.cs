using MovieJournalBackend.Extensions;
using System.Net;
using System.Text.Json;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed partial class WikimediaActorPhotoSearchService(HttpClient httpClient) : IActorPhotoSearchService
    {
        private const int MaxResults = 10;

        public async Task<List<ActorPhotoResult>> TrySearchAsync(string actorName, CancellationToken ct = default)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(actorName))
                    return [];

                var query = new Dictionary<string, string>
                {
                    ["action"] = "query",
                    ["generator"] = "search",
                    ["gsrsearch"] = $"filetype:bitmap \"{actorName.Trim()}\" portrait OR photo",
                    ["gsrnamespace"] = "6",
                    ["gsrlimit"] = MaxResults.ToString(),
                    ["prop"] = "imageinfo",
                    ["iiprop"] = "url|extmetadata",
                    ["iiurlwidth"] = "600",
                    ["iiextmetadatafilter"] = "Artist|LicenseShortName|LicenseUrl",
                    ["format"] = "json",
                    ["formatversion"] = "2"
                };

                var queryString = string.Join("&", query.Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value)}"));

                using var response = await httpClient.GetAsync($"w/api.php?{queryString}", HttpCompletionOption.ResponseHeadersRead, ct);

                response.EnsureSuccessStatusCode();

                await using var stream = await response.Content.ReadAsStreamAsync(ct);

                using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                if (!json.RootElement.TryGetProperty("query", out var queryElement) ||
                    !queryElement.TryGetProperty("pages", out var pages) ||
                    pages.ValueKind != JsonValueKind.Array)
                {
                    return [];
                }

                var results = new List<ActorPhotoResult>();

                foreach (var page in pages.EnumerateArray())
                {
                    if (!page.TryGetProperty("imageinfo", out var imageInfo) ||
                        imageInfo.ValueKind != JsonValueKind.Array ||
                        imageInfo.GetArrayLength() == 0)
                    {
                        continue;
                    }

                    var image = imageInfo[0];

                    var imageUrl = GetString(image, "thumburl") ?? GetString(image, "url");

                    var sourceUrl = GetString(image, "descriptionurl");

                    if (string.IsNullOrWhiteSpace(imageUrl) ||
                        string.IsNullOrWhiteSpace(sourceUrl))
                    {
                        continue;
                    }

                    var metadata = image.TryGetProperty("extmetadata", out var extmetadata)
                        ? extmetadata
                        : default;

                    results.Add(new ActorPhotoResult(
                        ImageUrl: imageUrl,
                        SourceUrl: sourceUrl,
                        Author: GetMetadataValue(metadata, "Artist"),
                        License: GetMetadataValue(metadata, "LicenseShortName"),
                        LicenseUrl: GetMetadataValue(metadata, "LicenseUrl")
                    ));
                }

                return results;
            }
            catch
            {
                return [];
            }
        }

        private static string? GetString(
            JsonElement element,
            string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var property) ||
                property.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            return property.GetString();
        }

        private static string? GetMetadataValue(JsonElement metadata, string propertyName)
        {
            if (metadata.ValueKind != JsonValueKind.Object ||
                !metadata.TryGetProperty(propertyName, out var property) ||
                !property.TryGetProperty("value", out var value) ||
                value.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            var raw = value.GetString();

            if (string.IsNullOrWhiteSpace(raw))
                return null;

            var withoutHtml = Regexes.WithoutHtmlRegex().Replace(raw, " ");

            return WebUtility.HtmlDecode(withoutHtml).Trim();
        }

    }
}
