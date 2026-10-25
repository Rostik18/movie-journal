using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Driver;
using MovieJournalBackend.Repositories.Common;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class DatabaseBackupService(IMongoDatabase database, MongoDbIndexInitializer initializer) : IDatabaseBackupService
    {
        private const int BatchSize = 500;

        private static readonly string[] preservedCollections = ["users"];

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

        public async Task<DropDbResult> ClearDbAsync(CancellationToken ct = default)
        {
            var collectionNames = await database
                .ListCollectionNames(cancellationToken: ct)
                .ToListAsync(ct);

            var droppedCollections = new List<string>();

            foreach (var collectionName in collectionNames)
            {
                ct.ThrowIfCancellationRequested();

                if (preservedCollections.Contains(collectionName)) continue;
                if (collectionName.StartsWith("system.", StringComparison.Ordinal)) continue;

                await database.DropCollectionAsync(collectionName, ct);

                droppedCollections.Add(collectionName);
            }

            await initializer.InitializeAsync(ct);

            return new(
            "Database collections dropped successfully.",
            preservedCollections,
            droppedCollections
            );
        }

        public async Task<RestoreResult> RestoreAsync(Stream input, CancellationToken ct = default)
        {
            using var archive = new ZipArchive(input, ZipArchiveMode.Read, leaveOpen: true);

            var manifestEntry = archive.GetEntry("manifest.json")
                ?? throw new InvalidDataException("Backup archive does not contain manifest.json.");

            BackupManifest manifest;

            await using (var manifestStream = manifestEntry.Open())
            {
                manifest = await JsonSerializer
                    .DeserializeAsync<BackupManifest>(manifestStream, cancellationToken: ct)
                    ?? throw new InvalidDataException("Invalid backup manifest.");
            }

            if (manifest.FormatVersion != 1)
            {
                throw new InvalidDataException($"Unsupported backup format version: {manifest.FormatVersion}.");
            }

            var collectionResults = new List<CollectionRestoreResult>();

            foreach (var collectionName in manifest.Collections.Distinct())
            {
                ct.ThrowIfCancellationRequested();

                if (string.IsNullOrWhiteSpace(collectionName) || collectionName.StartsWith("system.", StringComparison.Ordinal))
                {
                    throw new InvalidDataException($"Invalid collection name: '{collectionName}'.");
                }

                var entry = archive.GetEntry($"collections/{collectionName}.jsonl")
                    ?? throw new InvalidDataException($"Backup is missing collection '{collectionName}'.");

                var collection = database.GetCollection<BsonDocument>(collectionName);

                long imported = 0;
                long skipped = 0;

                await using var entryStream = entry.Open();
                using var reader = new StreamReader(entryStream);

                var batch = new List<BsonDocument>(BatchSize);

                while (true)
                {
                    ct.ThrowIfCancellationRequested();

                    var line = await reader.ReadLineAsync(ct);

                    if (line is null)
                        break;

                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    var document = BsonDocument.Parse(line);

                    if (!document.Contains("_id"))
                    {
                        throw new InvalidDataException($"A document in '{collectionName}' has no _id.");
                    }

                    batch.Add(document);

                    if (batch.Count >= BatchSize)
                    {
                        var result = await ImportBatchAsync(collection, batch, ct);

                        imported += result.Imported;
                        skipped += result.Skipped;
                        batch.Clear();
                    }
                }

                if (batch.Count > 0)
                {
                    var result = await ImportBatchAsync(collection, batch, ct);

                    imported += result.Imported;
                    skipped += result.Skipped;
                }

                collectionResults.Add(new CollectionRestoreResult(collectionName, imported, skipped));
            }

            return new RestoreResult(
                manifest.DatabaseName,
                collectionResults,
                collectionResults.Sum(x => x.Imported),
                collectionResults.Sum(x => x.Skipped));
        }

        private static async Task<BatchResult> ImportBatchAsync(IMongoCollection<BsonDocument> collection, List<BsonDocument> documents, CancellationToken ct)
        {
            var ids = documents
                .Select(document => document["_id"])
                .Distinct()
                .ToArray();

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);

            var existingDocuments = await collection
                .Find(filter)
                .Project(Builders<BsonDocument>.Projection.Include("_id"))
                .ToListAsync(ct);

            var existingIds = existingDocuments
                .Select(document => document["_id"])
                .ToHashSet();

            var seenIds = new HashSet<BsonValue>();
            var toInsert = new List<BsonDocument>(documents.Count);
            long skipped = 0;

            foreach (var document in documents)
            {
                var id = document["_id"];

                if (existingIds.Contains(id) || !seenIds.Add(id))
                {
                    skipped++;
                    continue;
                }

                toInsert.Add(document);
            }

            if (toInsert.Count > 0)
            {
                await collection.InsertManyAsync(toInsert, new InsertManyOptions { IsOrdered = false }, ct);
            }

            return new BatchResult(toInsert.Count, skipped);
        }

        private sealed record BackupManifest(
            int FormatVersion,
            string DatabaseName,
            DateTime CreatedAtUtc,
            IReadOnlyList<string> Collections);

        private sealed record BatchResult(long Imported, long Skipped);
    }
}
