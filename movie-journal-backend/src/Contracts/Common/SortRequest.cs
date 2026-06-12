using MongoDB.Driver;

namespace MovieJournalBackend.Contracts.Common
{
    public sealed record SortRequest<TSortField>(TSortField Field, SortDirection Direction);
}
