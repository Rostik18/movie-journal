namespace MovieJournalBackend.Extensions
{
    public static class Helpers
    {
        public static string Normalize(string title) => title.Trim().ToUpperInvariant();
    }
}
