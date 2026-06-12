namespace MovieJournalBackend.Contracts.Common
{
    public sealed record PaginationRequest(int Offset = 0, int Size = 20);
}
