namespace MovieJournalBackend.Repositories.Common
{
    public sealed record Page<T>(List<T> Items, int Offset, int Size, long TotalCount);
}
