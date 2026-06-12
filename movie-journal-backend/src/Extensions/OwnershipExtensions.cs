using MongoDB.Driver;
using MovieJournalBackend.Entities.Base;
using System.Security.Claims;

namespace MovieJournalBackend.Extensions
{
    public static class OwnershipExtensions
    {
        public static IEndpointConventionBuilder RequireAdmin(this IEndpointConventionBuilder builder) =>
            builder.RequireAuthorization(policy => policy.RequireClaim(ClaimTypes.Role, UserRole.Admin.ToString()));

        public static IEndpointConventionBuilder RequireAnyRole(this IEndpointConventionBuilder builder) =>
            builder.RequireAuthorization(policy => policy.RequireClaim(ClaimTypes.Role, UserRole.Admin.ToString(), UserRole.User.ToString()));

        public static UserContext ToUserContext(this ClaimsPrincipal principal)
        {
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new UnauthorizedAccessException();

            var roles = principal.Claims
                    .Where(x => x.Type == ClaimTypes.Role)
                    .Select(x => Enum.Parse<UserRole>(x.Value))
                    .ToArray();

            return new(userId, roles);
        }

        public static FilterDefinition<T> BuildVisibilityFilter<T>(this UserContext user) where T : OwnedEntity =>
            user.IsAdmin
                ? Builders<T>.Filter.Empty
                : Builders<T>.Filter.Or(
                    Builders<T>.Filter.Eq(x => x.Visibility, Visibility.Public),
                    Builders<T>.Filter.Eq(x => x.OwnerUserId, user.UserId));

    }
}
