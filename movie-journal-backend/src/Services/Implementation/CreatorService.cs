using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.Creator;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Entities.Creator;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend.Services.Implementation
{
    public sealed class CreatorService(
        ICreatorRepository _creatorRepository,
        IMediaRepository _mediaRepository,
        IRealtimeService _realtimeService
        ) : ICreatorService
    {
        public Task<Creator?> GetByIdAsync(string creatorId, UserContext user, CancellationToken ct = default) =>
            _creatorRepository.GetByIdAsync(creatorId, user, ct);

        public Task<Page<Creator>> SearchAsync(SearchRequest<CreatorFilter, CreatorSortField> request, UserContext user, CancellationToken ct = default) =>
            _creatorRepository.SearchAsync(request, user, ct);

        public async Task<Creator> CreateAsync(CreateCreatorRequest request, UserContext user, CancellationToken ct = default)
        {
            if (await _creatorRepository.ExistsAsync(request.Name, user, ct))
            {
                throw new ValidationException($"Creator '{request.Name}' already exists.");
            }

            var creator = new Creator
            {
                Name = request.Name,
                NormalizedName = Helpers.Normalize(request.Name),
                Description = request.Description,
                ImageUrl = request.ImageUrl,
                WebsiteUrl = request.WebsiteUrl,
                Visibility = request.Visibility,
                OwnerUserId = user.UserId,
                CreatedByUserId = user.UserId
            };

            await _creatorRepository.CreateAsync(creator, ct);

            await _realtimeService.PublishAsync(user.UserId, creator.Visibility, ResourceType.Creator, EventType.Created, creator.Id);

            return creator;
        }

        public async Task<Creator> UpdateAsync(UpdateCreatorRequest request, UserContext user, CancellationToken ct = default)
        {
            var creator = await _creatorRepository.GetByIdAsync(request.CreatorId, user, ct)
                ?? throw new ApplicationException($"Creator '{request.CreatorId}' not found.");

            user.EnsureCanEdit(creator);

            if (request.Name is not null)
            {
                creator.Name = request.Name;
            }
            if (request.Description is not null)
            {
                creator.Description = request.Description;
            }
            if (request.ImageUrl is not null)
            {
                creator.ImageUrl = request.ImageUrl;
            }
            if (request.Visibility.HasValue)
            {
                var hasPublicMedia = await _mediaRepository.HasPublicMediaUsingCreatorAsync(request.CreatorId, ct);

                if (hasPublicMedia && request.Visibility == Visibility.Private)
                {
                    throw new ValidationException("Public media cannot contain private creator.");
                }

                creator.Visibility = request.Visibility.Value;
            }

            creator.NormalizedName = Helpers.Normalize(creator.Name);
            creator.LastModifiedByUserId = user.UserId;

            await _creatorRepository.UpdateAsync(creator, ct);

            await _realtimeService.PublishAsync(user.UserId, creator.Visibility, ResourceType.Creator, EventType.Updated, creator.Id);

            return creator;
        }

        public async Task DeleteAsync(string creatorId, UserContext user, CancellationToken ct = default)
        {
            var creator = await _creatorRepository.GetByIdAsync(creatorId, user, ct)
                ?? throw new ApplicationException($"Creator '{creatorId}' not found.");

            user.EnsureCanDelete(creator);

            await _creatorRepository.DeleteAsync(creatorId, ct);

            await _realtimeService.PublishAsync(user.UserId, creator.Visibility, ResourceType.Creator, EventType.Deleted, creator.Id);
        }
    }
}
