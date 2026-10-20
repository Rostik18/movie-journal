using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Driver;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class DatabaseBackupService(IMongoDatabase database) : IDatabaseBackupService
    {
        private static readonly JsonWriterSettings JsonSettings = new()
        {
            OutputMode = JsonOutputMode.CanonicalExtendedJson
        };

        public async Task ExportToFileAsync(string path, CancellationToken ct = default)
        {
            await using var file = new FileStream(
                path,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                options: FileOptions.Asynchronous | FileOptions.SequentialScan);

            using var archive = new ZipArchive(file, ZipArchiveMode.Create, leaveOpen: true);

            var collectionNames = await database
                .ListCollectionNames(cancellationToken: ct)
                .ToListAsync(ct);

            collectionNames = [.. collectionNames
                .Where(name =>
                    !name.StartsWith("system.", StringComparison.Ordinal))
                .OrderBy(name => name, StringComparer.Ordinal)];

            var manifest = new BackupManifest(
                FormatVersion: 1,
                DatabaseName: database.DatabaseNamespace.DatabaseName,
                CreatedAtUtc: DateTime.UtcNow,
                Collections: collectionNames);

            foreach (var collectionName in collectionNames)
            {
                ct.ThrowIfCancellationRequested();

                var entry = archive.CreateEntry($"collections/{collectionName}.jsonl", CompressionLevel.Optimal);

                await using var entryStream = entry.Open();

                await using var writer = new StreamWriter(entryStream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));

                var collection = database.GetCollection<BsonDocument>(collectionName);

                using var cursor = await collection
                    .Find(FilterDefinition<BsonDocument>.Empty)
                    .ToCursorAsync(ct);

                while (await cursor.MoveNextAsync(ct))
                {
                    foreach (var document in cursor.Current)
                    {
                        ct.ThrowIfCancellationRequested();

                        await writer.WriteLineAsync(document.ToJson(JsonSettings).AsMemory(), ct);
                    }
                }
            }

            var manifestEntry = archive.CreateEntry("manifest.json", CompressionLevel.Optimal);

            await using var manifestStream = manifestEntry.Open();

            await JsonSerializer.SerializeAsync(
                manifestStream,
                manifest,
                cancellationToken: ct);
        }

        private sealed record BackupManifest(
            int FormatVersion,
            string DatabaseName,
            DateTime CreatedAtUtc,
            IReadOnlyList<string> Collections);
    }
}
