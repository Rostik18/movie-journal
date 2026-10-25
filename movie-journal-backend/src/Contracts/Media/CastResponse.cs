namespace MovieJournalBackend.Contracts.Media
{
    public sealed record CastResponse(
        string Id,
        string FullName,
        string? PhotoUrl,
        string? CharacterName);
}
