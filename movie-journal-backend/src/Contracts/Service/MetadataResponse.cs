namespace MovieJournalBackend.Contracts.Service
{
    public sealed record MetadataResponse(
        string? Title,
        string? Description,
        string? Image);
}
