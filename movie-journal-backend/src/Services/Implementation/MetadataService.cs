using MovieJournalBackend.Contracts.Service;
using AngleSharp.Html.Parser;

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

            string? GetMetaContent(string property)
            {
                return document
                    .QuerySelector($"meta[property='{property}']")
                    ?.GetAttribute("content")
                    ?.Trim();
            }

            var image = GetMetaContent("og:image");

            if (!string.IsNullOrWhiteSpace(image) &&
                Uri.TryCreate(url, image, out var absoluteImageUri))
            {
                image = absoluteImageUri.ToString();
            }

            return new MetadataResponse(
                Title: GetMetaContent("og:title"),
                Description: GetMetaContent("og:description"),
                Image: image);
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
