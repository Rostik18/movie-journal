using AngleSharp.Html.Parser;
using MovieJournalBackend.Contracts.Maintenance;
using MovieJournalBackend.Entities.Base;
using System.Globalization;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class MetadataService(HttpClient httpClient) : IMetadataService
    {
        private const int MaxHtmlSize = 2 * 1024 * 1024;

        public async Task<MetadataResponse> GetMetadataAsync(Uri url, CancellationToken ct = default)
        {
            using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);

            response.EnsureSuccessStatusCode();

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

            string? GetMetaContent(params string[] names)
            {
                foreach (var name in names)
                {
                    var content = document
                        .QuerySelector(
                            $"meta[property='{name}'], meta[name='{name}']")
                        ?.GetAttribute("content")
                        ?.Trim();

                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        return content;
                    }
                }

                return null;
            }

            string[] GetMetaContents(params string[] names) =>
            [.. names
                .SelectMany(name => document.QuerySelectorAll($"meta[property='{name}'], meta[name='{name}']"))
                .Select(element => element.GetAttribute("content")?.Trim())
                .Where(content => !string.IsNullOrWhiteSpace(content))
                .Select(content => content!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
            ];

            MediaType? GetMediaType()
            {
                foreach (var rawType in GetMetaContents("og:type"))
                {
                    var type = rawType.ToLowerInvariant();

                    var mediaType = type switch
                    {
                        "video.movie" => MediaType.Movie,

                        "video.tv_show" => MediaType.SeriesEpisode,
                        "video.episode" => MediaType.SeriesEpisode,

                        "video.other" or
                        "video:other" or
                        "video" => MediaType.Video,

                        _ => (MediaType?)null
                    };

                    if (mediaType.HasValue)
                    {
                        return mediaType;
                    }
                }

                return null;
            }

            var image = GetMetaContent("og:image", "twitter:image");

            if (!string.IsNullOrWhiteSpace(image) &&
                Uri.TryCreate(url, image, out var absoluteImageUri))
            {
                image = absoluteImageUri.ToString();
            }

            var durationText = GetMetaContent("og:video:duration", "video:duration", "og:duration");

            int? durationSeconds =
                int.TryParse(
                    durationText,
                    NumberStyles.Integer,
                    CultureInfo.InvariantCulture,
                    out var seconds) && seconds >= 0
                        ? seconds
                        : null;

            var publishedAtText = GetMetaContent("article:published_time", "og:video:release_date", "datePublished", "video:release_date");

            DateTime? publishedAtUtc =
                DateTimeOffset.TryParse(
                    publishedAtText,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal,
                    out var publishedAt)
                        ? publishedAt.UtcDateTime
                        : null;

            return new MetadataResponse(
                Title: GetMetaContent("og:title", "twitter:title"),
                Description: GetMetaContent("og:description", "twitter:description"),
                Image: image,
                DurationSeconds: durationSeconds,
                Author: GetMetaContent("author", "article:author", "og:video:actor"),
                PublishedAtUtc: publishedAtUtc,
                Type: GetMediaType(),
                Tags: GetMetaContents("og:video:tag", "video:tag"));
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
