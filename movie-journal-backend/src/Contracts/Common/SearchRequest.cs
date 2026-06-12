namespace MovieJournalBackend.Contracts.Common
{
    public sealed class SearchRequest<TFilter, TSortField> where TFilter : class
    {
        public TFilter? Filter { get; init; }
        public PaginationRequest Page { get; init; } = new();
        public SortRequest<TSortField>? Sort { get; init; }
    }
}
