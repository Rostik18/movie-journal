
namespace MovieJournalBackend.Services
{
    public interface IDatabaseBackupService
    {
        Task ExportToFileAsync(string path, CancellationToken ct = default);
        Task<DropDbResult> ClearDbAsync(CancellationToken ct = default);
        Task<RestoreResult> RestoreAsync(Stream input, CancellationToken ct = default);
    }

    public sealed record CollectionRestoreResult(
        string Collection,
        long Imported,
        long Skipped);

    public sealed record RestoreResult(
        string SourceDatabase,
        IReadOnlyList<CollectionRestoreResult> Collections,
        long TotalImported,
        long TotalSkipped);

    public sealed record DropDbResult(
        string Message,
        string[] PreservedCollections,
        List<string> DroppedCollections
    );
}
