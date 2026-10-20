namespace MovieJournalBackend.Contracts.Service
{
    public sealed class RestoreBackupRequest
    {
        public IFormFile? File { get; set; }
    }
}
