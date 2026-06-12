using MovieJournalBackend.Entities.Base;

namespace MovieJournalBackend
{
    public sealed record UserContext(string UserId, IReadOnlyCollection<UserRole> Roles)
    {
        public bool IsAdmin => Roles.Contains(UserRole.Admin);

        public void EnsureAdmin()
        {
            if (!IsAdmin)
            {
                throw new UnauthorizedAccessException("Admin access required.");
            }
        }

        public bool CanRead(OwnedEntity entity) => IsAdmin || entity.Visibility == Visibility.Public || entity.OwnerUserId == UserId;

        public void EnsureCanRead(OwnedEntity entity)
        {
            if (!CanRead(entity))
            {
                throw new UnauthorizedAccessException("You do not have access to this resource.");
            }
        }

        public bool CanEdit(OwnedEntity entity) => IsAdmin || entity.OwnerUserId == UserId;

        public void EnsureCanEdit(OwnedEntity entity)
        {
            if (!CanEdit(entity))
            {
                throw new UnauthorizedAccessException("You do not have permission to edit this resource.");
            }
        }
    }
}
