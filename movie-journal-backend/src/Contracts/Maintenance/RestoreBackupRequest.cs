namespace MovieJournalBackend.Contracts.Maintenance
{
    public sealed class RestoreBackupRequest
    {
        public IFormFile? File { get; set; }
    }
}
