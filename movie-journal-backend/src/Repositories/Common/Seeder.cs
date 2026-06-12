using Microsoft.Extensions.Options;
using MovieJournalBackend.Entities.Actor;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Media;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services.Auth;
using MovieJournalBackend.Settings;

namespace MovieJournalBackend.Repositories.Common
{
    public sealed class Seeder(
        IUserRepository _userRepository,
        IActorRepository _actorRepository,
        IMediaCollectionRepository _mediaCollectionRepository,
        IMediaRepository _mediaRepository,
        IPasswordService _passwordService,
        IOptions<AdminSeedSettings> _options) : IDisposable
    {
        private static string _adminId = Guid.CreateVersion7().ToString();
        private static Actor[] _actors = [
            new()
            {
                FullName = "Ryan Gosling",
                NormalizedFullName = Helpers.Normalize("Ryan Gosling"),
                BirthDate = new(1980, 11, 12),
                Biography = "Canadian film actor. Three-time Oscar nominee for roles in the drama Half Nelson, the musical La La Land and the comedy Barbie, winner of the Golden Globe Award for his role in La La Land. Gosling's band Dead Man's Bones released their self-titled album in 2009.",
                CreatedByUserId = _adminId,
                OwnerUserId = _adminId,
                PhotoUrl = "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcSGm1HLLA32H2mtH_lpTrRs9PlK0aWCjFixoZmiGrnR66c2kZdTxo07tKlPU_WbZ6M6_WxadD818BXLIi8"
            },
            new()
            {
                FullName = "Emma Stone",
                NormalizedFullName = Helpers.Normalize("Emma Stone"),
                BirthDate = new(1988, 11, 6),
                Biography = "American actress and film producer. Winner of numerous awards, including two Academy Awards, two BAFTA Awards, two Golden Globe Awards, and three Screen Actors Guild Awards. In 2017, Stone was the highest-paid actress according to Forbes magazine, with earnings of $26 million.",
                CreatedByUserId = _adminId,
                OwnerUserId = _adminId,
                PhotoUrl = "https://assets.vogue.com/photos/68f8bc236a14a6c83b5d66d9/master/w_2560%2Cc_limit/GettyImages-2242466644.jpg"
            },
            new()
            {
                FullName = "Ana de Armas",
                NormalizedFullName = Helpers.Normalize("Ana de Armas"),
                BirthDate = new(1988, 04, 30),
                Biography = "Cuban-Spanish film actress and model. After success in her homeland and in Spain, she moved to Hollywood and became famous for her roles in the films Blade Runner 2049, Knives Out, No Time to Die and Blonde.",
                CreatedByUserId = _adminId,
                OwnerUserId = _adminId,
                PhotoUrl = "https://assets.vogue.com/photos/68f8bc236a14a6c83b5d66d9/master/w_2560%2Cc_limit/GettyImages-2242466644.jpg"
            }
        ];
        private static MediaCollection[] _mediaCollection = [
            new(){
                Name = "Той, хто біжить по лезу",
                OwnerUserId = _adminId,
                CreatedByUserId = _adminId,
                Tags = ["Гослінг"]
            }
        ];
        private static Media[] _media = [
            new()
            {
                Title = "Ла-Ла Ленд",
                NormalizedTitle = Helpers.Normalize("Ла-Ла Ленд"),
                OriginalTitle = "Lalaland",
                ReleaseYear = 2016,
                Genres = ["Мюзикл", "Романтика"],
                PosterUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlQLhUnpegljTSpgZxus1Xe4_cGMwwgnYJUzEZdtoDXChTaS1OfEBNsp0sXG0O4NdFMYIJXHTRpPMTYroq-sQuWv5RcMrCfIOeVxjgS6Q&s=10",
                Type = MediaType.Movie,
                Tags = ["Гослінг", "літералі мі"],
                Cast = [
                    new() { ActorId = _actors[0].Id, FullName = _actors[0].FullName },
                    new() { ActorId = _actors[1].Id, FullName = _actors[1].FullName }
                    ],
                CreatedByUserId = _adminId,
                OwnerUserId = _adminId
            },
            new()
            {
                Title = "Той, хто біжить по лезу 2049",
                NormalizedTitle = Helpers.Normalize("Той, хто біжить по лезу 2049"),
                OriginalTitle = "Blade Runner 2049",
                ReleaseYear = 2017,
                Genres = ["Наукова фантастика", "Екшн"],
                PosterUrl = "https://occ-0-8407-2218.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABYSMlpt5w6j57Fr_vtbvbpAHkkkbm3tWxse17BtG96hl9whFbNJIYhcZ2fIF5oHj1Zch8AYhsCj1Z-Bc-EGqsASgYIzaxRFzNS0O.jpg?r=ad3",
                Type = MediaType.Movie,
                Tags = ["Гослінг", "літералі мі"],
                Cast = [
                    new() { ActorId = _actors[0].Id, FullName = _actors[0].FullName },
                    new() { ActorId = _actors[2].Id, FullName = _actors[2].FullName, CharacterName = "Джої" }
                    ],
                CreatedByUserId = _adminId,
                OwnerUserId = _adminId,
                Collection = new(){
                    Id = _mediaCollection[0].Id,
                    Name = _mediaCollection[0].Name
                }
            }
        ];

        public async Task SeedAsync(CancellationToken ct = default)
        {
            await SeedAdmin(ct);
            await SeedActors(ct);
            await SeedMediaCollection(ct);
            await SeedMedia(ct);
        }

        private async Task SeedAdmin(CancellationToken ct = default)
        {
            var exists = await _userRepository.AnyInRoleAsync(UserRole.Admin, ct);

            if (exists)
            {
                return;
            }

            var hash = _passwordService.HashPassword(_options.Value.Password);

            var admin = new User
            {
                Id = _adminId,
                Login = _options.Value.Username,
                PasswordHash = hash,
                Roles = [UserRole.Admin, UserRole.User]
            };

            await _userRepository.CreateAsync(admin, ct);
        }

        private async Task SeedActors(CancellationToken ct = default)
        {
            var exists = await _actorRepository.Any(ct);

            if (exists)
            {
                return;
            }

            foreach (var item in _actors)
            {
                await _actorRepository.CreateAsync(item, ct);
            }
        }

        private async Task SeedMediaCollection(CancellationToken ct = default)
        {
            var exists = await _mediaCollectionRepository.Any(ct);

            if (exists)
            {
                return;
            }

            foreach (var item in _mediaCollection)
            {
                await _mediaCollectionRepository.CreateAsync(item, ct);
            }
        }

        private async Task SeedMedia(CancellationToken ct = default)
        {
            var exists = await _mediaRepository.Any(ct);

            if (exists)
            {
                return;
            }

            foreach (var item in _media)
            {
                await _mediaRepository.CreateAsync(item, ct);
            }
        }

        public void Dispose()
        {
            _adminId = null!;
            _actors = null!;
            _mediaCollection = null!;
            _media = null!;
        }
    }
}
