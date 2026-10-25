namespace MovieJournalBackend.Extensions
{
    public static class Helpers
    {
        public static string Normalize(string title, string? alias = null) => string.IsNullOrWhiteSpace(alias)
            ? title.Trim().ToUpperInvariant()
            : $"{title.Trim().ToUpperInvariant()} ({alias.Trim().ToUpperInvariant()})";
    }
}
