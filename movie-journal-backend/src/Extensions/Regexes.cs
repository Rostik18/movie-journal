using System.Text.RegularExpressions;

namespace MovieJournalBackend.Extensions
{
    public static partial class Regexes
    {
        [GeneratedRegex("<[^>]+>")] public static partial Regex WithoutHtmlRegex();
        [GeneratedRegex(@"\(([^()]*)\)")] public static partial Regex AliasRegex();
        [GeneratedRegex(@"\s*\([^()]*\)")] public static partial Regex NameRegex();
        [GeneratedRegex(@"\((\d{4})\)\s*$")] public static partial Regex YearRegex();
        [GeneratedRegex(@"[sS](\d+)\s*:\s*[eE](\d+)")] public static partial Regex SeriesEpisodeRegex();
    }
}
