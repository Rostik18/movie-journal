using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;
using MovieJournalBackend.Contracts.Maintenance;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Extensions;
using System.Globalization;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed partial class MetadataService(HttpClient httpClient) : IMetadataService
    {
        private const int MaxHtmlSize = 2 * 1024 * 1024;

        public async Task<MetadataResponse> GetMetadataAsync(Uri url, CancellationToken ct = default)
        {
            using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);

            response.EnsureSuccessStatusCode();

            // Посилання прямо на відеофайл: HTML не розбираємо
            var contentType = response.Content.Headers.ContentType?.MediaType;
            if (contentType is not null && contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
            {
                return new MetadataResponse(
                    Title: Path.GetFileNameWithoutExtension(url.AbsolutePath),
                    Description: null, Image: null, DurationSeconds: null, Author: null,
                    PublishedAtUtc: null, Tags: [],
                    Link: new(url.ToString(), LinkType.Video),
                    PlayerWidth: null, PlayerHeight: null);
            }

            var contentLength = response.Content.Headers.ContentLength;

            if (contentLength > MaxHtmlSize)
            {
                throw new InvalidOperationException("The HTML page is too large.");
            }

            await using var stream = await response.Content.ReadAsStreamAsync(ct);

            using var limitedStream = new LimitedReadStream(stream, MaxHtmlSize);
            using var reader = new StreamReader(limitedStream);

            var html = await reader.ReadToEndAsync(ct);

            var parser = new HtmlParser();
            var document = await parser.ParseDocumentAsync(html, ct);

            var image = GetMetaContent(document, "og:image", "twitter:image");

            if (!string.IsNullOrWhiteSpace(image) && Uri.TryCreate(url, image, out var absoluteImageUri))
            {
                image = absoluteImageUri.ToString();
            }

            var durationText = GetMetaContent(document, "og:video:duration", "video:duration", "og:duration");

            int? durationSeconds = int.TryParse(
                durationText,
                NumberStyles.Integer,
                CultureInfo.InvariantCulture,
                out var seconds) && seconds >= 0
                    ? seconds
                    : null;

            var publishedAtText = GetMetaContent(document, "article:published_time", "og:video:release_date", "datePublished", "video:release_date");

            DateTime? publishedAtUtc = DateTimeOffset.TryParse(
                publishedAtText,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var publishedAt)
                    ? publishedAt.UtcDateTime
                    : null;

            return new MetadataResponse(
                Title: GetMetaContent(document, "og:title", "twitter:title"),
                Description: GetMetaContent(document, "og:description", "twitter:description"),
                Image: image,
                DurationSeconds: durationSeconds,
                Author: GetMetaContent(document, "author", "article:author", "og:video:actor"),
                PublishedAtUtc: publishedAtUtc,
                Tags: [.. GetMetaContents(document, "og:video:tag", "video:tag")
                    .SelectMany(x => x.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    .Distinct(StringComparer.OrdinalIgnoreCase)],
                Link: GetPlayerLink(url, document),
                PlayerWidth: int.TryParse(GetMetaContent(document, "og:video:width", "twitter:player:width"), out var w) ? w : null,
                PlayerHeight: int.TryParse(GetMetaContent(document, "og:video:height", "twitter:player:height"), out var h) ? h : null
            );
        }

        public static string? GetMetaContent(IHtmlDocument document, params string[] names)
        {
            foreach (var name in names)
            {
                var content = document
                    .QuerySelector(
                        $"meta[property='{name}'], meta[name='{name}'], meta[itemprop='{name}']")
                    ?.GetAttribute("content")
                    ?.Trim();

                if (!string.IsNullOrWhiteSpace(content))
                {
                    return content;
                }
            }

            return null;
        }

        private static string[] GetMetaContents(IHtmlDocument document, params string[] names) =>
        [.. names
                .SelectMany(name => document.QuerySelectorAll($"meta[property='{name}'], meta[name='{name}'], meta[itemprop='{name}']"))
                .Select(element => element.GetAttribute("content")?.Trim())
                .Where(content => !string.IsNullOrWhiteSpace(content))
                .Select(content => content!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
        ];


        /// <summary>
        /// Усі кандидати на плеєр зі сторінки: Open Graph, Twitter Player Card, schema.org.
        /// Сайти часто дублюють og:video:* з різними посиланнями й типами (і частина з них зламана), тому перебираємо
        /// всі, відкидаємо некоректні, а обираємо за пріоритетом: спочатку Embed, потім Video (https — раніше за http).
        /// </summary>
        private static MediaLink? GetPlayerLink(Uri url, IHtmlDocument document)
        {
            var candidates = new List<MediaLink>();

            void Add(string? raw, string? mime)
            {
                if (ToHttpUrl(url, raw) is { } link && Classify(link, mime) is { } type)
                {
                    candidates.Add(new(link, type));
                }
            }

            // 1. Open Graph. Тег og:video:type стосується найближчого попереднього og:video / :url / :secure_url,
            //    тож проходимо теги в порядку документа й пов'язуємо кожне посилання з його типом.
            var ogVideos = new List<(string Url, string? Mime)>();
            string? pendingMime = null;

            foreach (var meta in document.QuerySelectorAll("meta"))
            {
                var name = (meta.GetAttribute("property") ?? meta.GetAttribute("name"))?.Trim().ToLowerInvariant();
                var content = meta.GetAttribute("content")?.Trim();

                if (string.IsNullOrWhiteSpace(content)) continue;

                if (name is "og:video" or "og:video:url" or "og:video:secure_url")
                {
                    // Той самий URL у og:video та og:video:url — це один кандидат
                    if (ogVideos.Count > 0 && string.Equals(ogVideos[^1].Url, content, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    ogVideos.Add((content, pendingMime));
                    pendingMime = null;
                }
                else if (name == "og:video:type")
                {
                    if (ogVideos.Count > 0 && ogVideos[^1].Mime is null)
                    {
                        ogVideos[^1] = (ogVideos[^1].Url, content);
                    }
                    else
                    {
                        pendingMime = content;
                    }
                }
            }

            foreach (var (videoUrl, mime) in ogVideos)
            {
                Add(videoUrl, mime);
            }

            // 2. Twitter Player Card
            Add(GetMetaContent(document, "twitter:player:stream"), GetMetaContent(document, "twitter:player:stream:content_type"));
            if (ToHttpUrl(url, GetMetaContent(document, "twitter:player")) is { } player)
            {
                candidates.Add(new(player, LinkType.Embed));
            }

            // 3. schema.org (microdata)
            if (ToHttpUrl(url, GetMetaContent(document, "embedUrl")) is { } embed)
            {
                candidates.Add(new(embed, LinkType.Embed));
            }
            Add(GetMetaContent(document, "contentUrl"), null);

            // Пріоритет: Embed, потім Video; серед однакових — https перед http, далі порядок на сторінці
            return PickBest(candidates, LinkType.Embed) ?? PickBest(candidates, LinkType.Video);
        }

        private static MediaLink? PickBest(List<MediaLink> candidates, LinkType type) =>
            candidates
                .Where(c => c.Type == type)
                .OrderByDescending(c => c.Url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                .FirstOrDefault();

        // Абсолютний http(s)-URL; relative → відносно сторінки; інше (javascript:, data:, mailto:) відкидаємо
        private static string? ToHttpUrl(Uri url, string? raw) =>
            !string.IsNullOrWhiteSpace(raw) &&
            Uri.TryCreate(url, raw.Trim(), out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                ? uri.ToString()
                : null;

        // type/subtype без пробілів і зайвих символів; «video/» чи «video» — зламаний тип
        private static bool IsValidMime(string mime) => Regexes.MimeRegex().IsMatch(mime);

        // За MIME/розширенням: Video, Embed або null (некоректний тип; не підтримуємо Flash, HLS/DASH тощо)
        private static LinkType? Classify(string link, string? mime)
        {
            mime = mime?.Trim().ToLowerInvariant();

            // Тип вказано, але він зламаний: така пара тип+посилання недостовірна, пропускаємо
            if (!string.IsNullOrEmpty(mime) && !IsValidMime(mime))
            {
                return null;
            }

            var path = new Uri(link).AbsolutePath.ToLowerInvariant();

            if (path.EndsWith(".m3u8") || path.EndsWith(".mpd") ||
                mime is "application/x-mpegurl" or "application/vnd.apple.mpegurl" or "application/dash+xml" ||
                mime == "application/x-shockwave-flash")
            {
                return null;
            }

            if (mime?.StartsWith("video/") == true ||
                path.EndsWith(".mp4") || path.EndsWith(".webm") || path.EndsWith(".ogv") || path.EndsWith(".mov"))
            {
                return LinkType.Video;
            }

            return LinkType.Embed; // text/html або тип не вказано
        }
    }

    public sealed class LimitedReadStream(Stream inner, int maxBytes) : Stream
    {
        private int bytesRead;

        public override bool CanRead => inner.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            var remaining = maxBytes - bytesRead;

            if (remaining <= 0)
            {
                if (inner.ReadByte() == -1)
                {
                    return 0;
                }

                throw new InvalidOperationException("The HTML page is too large.");
            }

            var read = inner.Read(buffer, offset, Math.Min(count, remaining));

            bytesRead += read;
            return read;
        }

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default)
        {
            var remaining = maxBytes - bytesRead;

            if (remaining <= 0)
            {
                var probe = new byte[1];

                if (await inner.ReadAsync(probe, ct) == 0)
                {
                    return 0;
                }

                throw new InvalidOperationException("The HTML page is too large.");
            }

            var read = await inner.ReadAsync(buffer[..Math.Min(buffer.Length, remaining)], ct);

            bytesRead += read;
            return read;
        }

        public override void Flush() => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            // The underlying stream is owned by HttpResponseMessage.
            base.Dispose(disposing);
        }
    }
}