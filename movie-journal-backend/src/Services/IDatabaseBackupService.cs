namespace MovieJournalBackend.Services
{
    public interface IDatabaseBackupService
    {
        Task ExportToFileAsync(string path, CancellationToken ct = default);
        Task<string> ClearDbAsync(CancellationToken ct = default);
    }
}
