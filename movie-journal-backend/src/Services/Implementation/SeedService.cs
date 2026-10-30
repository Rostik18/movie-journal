using MovieJournalBackend.Contracts.Maintenance;
using MovieJournalBackend.Contracts.Media;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using System.Globalization;

namespace MovieJournalBackend.Services.Implementation
{
    public partial class SeedService(
        IActorPhotoSearchService actorPhotoService,
        IActorService actorService,
        ICreatorService creatorService,
        IMetadataService metadataService,
        IMediaService mediaService,
        IUserWatchingService uwService,
        IMediaCollectionService collectionService,
        ISeriesService seriesService
        ) : ISeedService
    {
        public async Task<IResult> SeedActors(SeedActorsRequest request, string userId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(request.Payload)) return Results.Ok("No payload");

            userId = request.UserId ?? userId;
            var actors = ParseActorsPayload(request.Payload);

            var missedLines = new List<SeedActorItem>();
            var lastError = "";

            foreach (var item in actors)
            {
                try
                {
                    await actorService.CreateAsync(new()
                    {
                        FullName = item.FullName,
                        Alias = item.Alias,
                        Visibility = request.Visibility,
                        BirthDate = item.BirthDate,
                        PhotoUrl = item.PhotoUrl is null
                             ? (await actorPhotoService.TrySearchAsync(item.FullName, ct)).LastOrDefault()?.ImageUrl
                             : item.PhotoUrl,
                        Biography = item.Biography,
                        Sex = item.Sex,
                        Nationalities = item.Nationalities ?? []
                    }, new(userId!, [UserRole.Admin]), ct);
                }
                catch (Exception ex)
                {
                    missedLines.Add(item);
                    lastError = ex.Message;
                    continue;
                }
            }

            return Results.Ok(new
            {
                Message = "Done",
                MissedActors = missedLines,
                LastError = lastError
            });
        }

        public async Task<IResult> SeedCollections(SeedCollectionsRequest request, string userId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(request.Payload)) return Results.Ok("No payload");

            userId = request.UserId ?? userId;
            var collections = ParseCollectionsPayload(request.Payload);

            var missedLines = new List<SeedCollectionItem>();
            var lastError = "";

            foreach (var item in collections)
            {
                try
                {
                    await collectionService.CreateAsync(new()
                    {
                        Name = item.Name,
                        Description = item.Description,
                        PosterUrl = item.ImageUrl,
                        Visibility = request.Visibility,
                        Tags = item.Tags.Concat(request.Tags).Distinct().ToList() ?? []
                    }, new(userId!, [UserRole.Admin]), ct);
                }
                catch (Exception ex)
                {
                    missedLines.Add(item);
                    lastError = ex.Message;
                    continue;
                }
            }

            return Results.Ok(new
            {
                Message = "Done",
                MissedLines = missedLines,
                LastError = lastError
            });
        }

        public async Task<IResult> SeedCreators(SeedCreatorsRequest request, string userId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(request.Payload)) return Results.Ok("No payload");

            userId = request.UserId ?? userId;
            var creators = ParseCreatorsPayload(request.Payload);

            var missedLines = new List<SeedCreatorItem>();

            var lastError = "";

            foreach (var item in creators)
            {
                try
                {
                    await creatorService.CreateAsync(new()
                    {
                        Name = item.Name,
                        Description = item.Description,
                        ImageUrl = item.ImageUrl,
                        WebsiteUrl = item.WebsiteUrl,
                        Visibility = request.Visibility
                    }, new(userId!, [UserRole.Admin]), ct);
                }
                catch (Exception ex)
                {
                    missedLines.Add(item);
                    lastError = ex.Message;
                    continue;
                }
            }

            return Results.Ok(new
            {
                Message = "Done",
                MissedCreators = missedLines,
                LastError = lastError
            });
        }

        public async Task<IResult> SeedSeries(SeedSeriesRequest request, string userId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(request.Payload)) return Results.Ok("No payload");

            userId = request.UserId ?? userId;
            var series = ParseSeriesPayload(request.Payload);

            var missedLines = new List<SeedSeriesItem>();
            var lastError = "";

            foreach (var item in series)
            {
                try
                {
                    await seriesService.CreateAsync(new()
                    {
                        Title = item.Name,
                        Description = item.Description,
                        PosterUrl = item.ImageUrl,
                        Visibility = request.Visibility,
                        Tags = item.Tags.Distinct().ToList() ?? []
                    }, new(userId!, [UserRole.Admin]), ct);
                }
                catch (Exception ex)
                {
                    missedLines.Add(item);
                    lastError = ex.Message;
                    continue;
                }
            }

            return Results.Ok(new
            {
                Message = "Done",
                MissedLines = missedLines,
                LastError = lastError
            });
        }

        public async Task<IResult> SeedUserWatch(SeedUserWatchRequest request, string userId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(request.Payload)) return Results.Ok("No payload");

            userId = request.UserId ?? userId;
            var admin = new UserContext(userId!, [UserRole.Admin]);

            var parsedPayload = ParseMedia(request.Payload);

            var actors = parsedPayload.Length > 0
                ? (await actorService.SearchAsync(new() { Page = new() { Size = 1000 } }, admin, ct)).Items
                : [];

            var creators = parsedPayload.Length > 0
                 ? (await creatorService.SearchAsync(new() { Page = new() { Size = 1000 } }, admin, ct)).Items
                 : [];

            var collections = parsedPayload.Length > 0
                ? (await collectionService.SearchAsync(new() { Page = new() { Size = 1000 } }, admin, ct)).Items
                : [];

            var series = parsedPayload.Length > 0
                ? (await seriesService.SearchAsync(new() { Page = new() { Size = 1000 } }, admin, ct)).Items
                : [];

            var missedLines = new List<UserWatch>();
            var lastError = "";

            foreach (var parsedItem in parsedPayload)
            {
                try
                {
                    if (!Uri.TryCreate(parsedItem.Url, UriKind.Absolute, out var uri) ||
                        string.IsNullOrWhiteSpace(uri.Host) ||
                        !string.IsNullOrEmpty(uri.UserInfo) ||
                        !string.IsNullOrEmpty(uri.Fragment))
                    {
                        missedLines.Add(parsedItem);
                        continue;
                    }

                    var metadata = await metadataService.GetMetadataAsync(uri, ct);

                    if (string.IsNullOrEmpty(metadata.Title) && string.IsNullOrEmpty(metadata.Image))
                    {
                        missedLines.Add(parsedItem);
                        continue;
                    }

                    var creator = parsedItem.Creator is null
                        ? null
                        : creators.FirstOrDefault(x => x.Name.Equals(parsedItem.Creator, StringComparison.InvariantCultureIgnoreCase));

                    var seriesId = parsedItem.Type is MediaType.SeriesEpisode
                        ? series.FirstOrDefault(x => x.Title.Equals(parsedItem.SeriesName, StringComparison.InvariantCultureIgnoreCase))?.Id
                        : null;

                    var media = new CreateMediaRequest()
                    {
                        Title = metadata.Title ?? parsedItem.Name ?? "",
                        OriginalTitle = metadata.Title ?? parsedItem.Name ?? "",
                        Description = metadata.Description,
                        CreatorId = creator?.Id,
                        Type = parsedItem.Type ?? metadata.Type ?? MediaType.Video,
                        Visibility = request.Visibility,
                        PosterUrl = metadata.Image,
                        Tags = metadata.Tags.Concat(request.Tags).Distinct().ToList() ?? [],
                        Duration = metadata.DurationSeconds,
                        ReleaseYear = metadata.PublishedAtUtc?.Year,
                        Links = [parsedItem.Url],
                        Episode = seriesId is null
                            ? null
                            : new() { SeriesId = seriesId, Season = parsedItem.Series, Episode = parsedItem.Episode },
                        CollectionId = string.IsNullOrEmpty(parsedItem.Collection)
                            ? request.CollectionId
                            : collections.FirstOrDefault(x => x.Name.Equals(parsedItem.Name, StringComparison.InvariantCultureIgnoreCase))?.Id
                    };

                    foreach (var cast in parsedItem.Cast)
                    {
                        var actor = actors.FirstOrDefault(x => x.FullName.Equals(cast, StringComparison.InvariantCultureIgnoreCase) || x.Alias?.ToLowerInvariant() == cast);

                        if (actor is null) continue;

                        media.Cast.Add(new() { ActorId = actor.Id, FullName = actor.FullName });
                    }

                    var createdMedia = await mediaService.CreateAsync(media, admin, ct);

                    var created = await uwService.CreateAsync(new()
                    {
                        MediaId = createdMedia.Id,
                        Rating = parsedItem.Rate,
                        Status = parsedItem.Rate is null ? Entities.Journal.WatchStatus.Wishlist : Entities.Journal.WatchStatus.Watched,
                        Visibility = request.Visibility
                    }, admin, ct);
                }
                catch (Exception ex)
                {
                    missedLines.Add(parsedItem);
                    lastError = ex.Message;
                    continue;
                }
            }

            return Results.Ok(new
            {
                Message = "Done",
                MissedLines = missedLines,
                LastError = lastError
            });
        }

        public sealed record SeedActorItem(string FullName, string? Alias, string? PhotoUrl, DateTime? BirthDate, string? Biography, Sex? Sex, List<string> Nationalities);
        private static SeedActorItem[] ParseActorsPayload(string payload) =>
        [..payload
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split('\t', StringSplitOptions.TrimEntries))
            .Select(columns =>
            {
                var match = Regexes.AliasRegex().Match(columns[0]);
                var fullName = Regexes.NameRegex().Replace(columns[0], "").Trim();
                var alias = match.Success
                    ? match.Groups[1].Value.Trim()
                    : null;

                return new SeedActorItem(
                    FullName: fullName,
                    Alias: string.IsNullOrWhiteSpace(alias) ? null : alias,
                    PhotoUrl: columns.Length > 1 && !string.IsNullOrWhiteSpace(columns[1])
                        ? columns[1]
                        : null,
                    BirthDate: columns.Length > 2 &&
                    DateTime.TryParseExact(columns[2], "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate)
                        ? parsedDate
                        : null,
                    Biography: columns.Length > 3 && !string.IsNullOrWhiteSpace(columns[3])
                        ? columns[3]
                        : null,
                    Sex: columns.Length > 4 && Enum.TryParse<Sex>(columns[4], out var sex)
                        ? sex
                        : null,
                    Nationalities: columns.Length > 5 && !string.IsNullOrWhiteSpace(columns[5])
                        ? [.. columns[5].Split(',').Select(n => n.Trim())]
                        : []
                );
            })
        ];

        public sealed record SeedSeriesItem(string Name, string? Description, string? ImageUrl, string[] Tags);
        private static SeedSeriesItem[] ParseSeriesPayload(string payload) =>
        [..payload
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split('\t', StringSplitOptions.TrimEntries))
            .Select(columns =>
            {
                var match = Regexes.AliasRegex().Match(columns[0]);
                var fullName = Regexes.NameRegex().Replace(columns[0], "").Trim();
                var alias = match.Success
                    ? match.Groups[1].Value.Trim()
                    : null;

                return new SeedSeriesItem(
                    Name: columns[0],
                    Description: columns.Length > 1 && !string.IsNullOrWhiteSpace(columns[1])
                        ? columns[1]
                        : null,
                    ImageUrl: columns.Length > 2 && !string.IsNullOrWhiteSpace(columns[2])
                        ? columns[2]
                        : null,
                    Tags: columns.Length > 3 && !string.IsNullOrWhiteSpace(columns[3])
                        ? [.. columns[3].Split(',').Select(n => n.Trim())]
                        : []
                );
            })
        ];

        public sealed record SeedCollectionItem(string Name, string? Description, string? ImageUrl, string[] Tags);
        private static SeedCollectionItem[] ParseCollectionsPayload(string payload) =>
        [..payload
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split('\t', StringSplitOptions.TrimEntries))
            .Select(columns =>
            {
                var match = Regexes.AliasRegex().Match(columns[0]);
                var fullName = Regexes.NameRegex().Replace(columns[0], "").Trim();
                var alias = match.Success
                    ? match.Groups[1].Value.Trim()
                    : null;

                return new SeedCollectionItem(
                    Name: columns[0],
                    Description: columns.Length > 1 && !string.IsNullOrWhiteSpace(columns[1])
                        ? columns[1]
                        : null,
                    ImageUrl: columns.Length > 2 && !string.IsNullOrWhiteSpace(columns[2])
                        ? columns[2]
                        : null,
                    Tags: columns.Length > 3 && !string.IsNullOrWhiteSpace(columns[3])
                        ? [.. columns[3].Split(',').Select(n => n.Trim())]
                        : []
                );
            })
        ];

        public sealed record SeedCreatorItem(string Name, string? Description, string? ImageUrl, string? WebsiteUrl);
        private static SeedCreatorItem[] ParseCreatorsPayload(string payload) =>
        [..payload
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split('\t', StringSplitOptions.TrimEntries))
            .Select(columns =>  new SeedCreatorItem(
                    Name: columns[0],
                    Description: columns.Length > 1 && !string.IsNullOrWhiteSpace(columns[1])
                        ? columns[1]
                        : null,
                    ImageUrl: columns.Length > 2 && !string.IsNullOrWhiteSpace(columns[2])
                        ? columns[2]
                        : null,
                    WebsiteUrl: columns.Length > 3 && !string.IsNullOrWhiteSpace(columns[3])
                        ? columns[3]
                        : null
                )
            )
        ];

        private record UserWatch(string Url, string? Name, int? Year, string[] Cast, string? Creator, int? Rate, string? Collection, MediaType? Type, int? Series, int? Episode, string? SeriesName);
        private static UserWatch[] ParseMedia(string text) =>
        [.. text
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split('\t', StringSplitOptions.TrimEntries))
            .Select(columns =>
            {
                var name = columns.Length > 1 && !string.IsNullOrWhiteSpace(columns[1])
                    ? columns[1]
                    : null;

                int? year = null;
                int? series = null;
                int? episode = null;
                MediaType? type = null;

                if (name is not null)
                {
                    var episodeMatch = Regexes.SeriesEpisodeRegex().Match(name);

                    if (episodeMatch.Success
                        && int.TryParse(episodeMatch.Groups[1].Value, out var parsedSeries)
                        && int.TryParse(episodeMatch.Groups[2].Value, out var parsedEpisode))
                    {
                        series = parsedSeries;
                        episode = parsedEpisode;
                        type = MediaType.SeriesEpisode;

                        name = name.Remove(episodeMatch.Index, episodeMatch.Length).Trim();
                    }

                    var yearMatch = Regexes.YearRegex().Match(name);

                    if (yearMatch.Success && int.TryParse(yearMatch.Groups[1].Value, out var parsedYear))
                    {
                        year = parsedYear;
                        name = name[..yearMatch.Index].TrimEnd();
                    }
                }

                var seriesName = columns.Length > 6 && !string.IsNullOrWhiteSpace(columns[6])
                    ? columns[6].Trim()
                    : null;

                type = string.IsNullOrEmpty(seriesName) ? type : MediaType.SeriesEpisode;

                var cast = columns.Length > 2 && !string.IsNullOrWhiteSpace(columns[2])
                    ? columns[2].Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                    : [];

                return new UserWatch(
                    Url: columns[0],
                    Name: name,
                    Year: year,
                    Cast: cast,
                    Creator: columns.Length > 3 && !string.IsNullOrWhiteSpace(columns[3])
                        ? columns[3].Trim().ToLowerInvariant()
                        : null,
                    Rate: columns.Length > 4 && int.TryParse(columns[4], out var rate)
                        ? rate
                        : null,
                    Collection: columns.Length > 5 && !string.IsNullOrWhiteSpace(columns[5])
                        ? columns[5].Trim().ToLowerInvariant()
                        : null,
                    Type: type ?? (columns.Length > 7 && !string.IsNullOrWhiteSpace(columns[7])
                        ? Enum.TryParse<MediaType>(columns[7], true, out var parsedType) ? parsedType : null
                        : null),
                    SeriesName: seriesName,
                    Series: series,
                    Episode: episode
                );
            })
        ];
    }
}
