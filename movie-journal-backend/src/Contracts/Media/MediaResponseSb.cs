using MovieJournalBackend.Contracts.MediaCollection;
using MovieJournalBackend.Contracts.Series;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;

namespace MovieJournalBackend.Contracts.Media
{
    public sealed record MediaResponseSb(
        string Id,
        string Title,
        string? Description,
        string? OriginalTitle,
        MediaType Type,
        int? ReleaseYear,
        int? Duration,
        string? PosterUrl,
        MediaCreator? Creator,
        List<string> Genres,
        List<string> Tags,
        List<string> Links,
        List<CastResponse> Cast,
        Visibility Visibility,
        SeriesResponse? Series,
        MediaCollectionResponse? Collection,
        EpisodeInfo? EpisodeInfo
        );
}
