using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MovieJournalBackend.Contracts.Common;
using MovieJournalBackend.Contracts.User;
using MovieJournalBackend.Entities.Base;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Services;
using System.Security.Claims;

namespace MovieJournalBackend.Endpoints
{
    public static class UserEndpoints
    {
        public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/users/me", GetCurrentUserAsync).RequireAnyRole();
            app.MapGet("/api/users/{userId}", GetByIdAsync).RequireAdmin();
            app.MapGet("/api/users/search", SearchAsync).RequireAdmin();
            app.MapPost("/api/users/", CreateAsync).RequireAdmin();
            app.MapPut("/api/users/", UpdateAsync).RequireAdmin();
            app.MapPut("/api/users/password", ChangePasswordAsync).RequireAnyRole();
            app.MapDelete("/api/users/{userId}", DeleteAsync).RequireAdmin();

            return app;
        }

        private static async Task<IResult> GetCurrentUserAsync(
            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            var result = await userService.GetCurrentUserAsync(principal.ToUserContext(), ct);

            return Results.Ok(result.ToResponse());
        }

        private static async Task<IResult> GetByIdAsync(
            string userId,
            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            var result = await userService.GetByIdAsync(userId, principal.ToUserContext(), ct);

            return result is null
                ? Results.NotFound()
                : Results.Ok(result.ToResponse());
        }

        private static async Task<IResult> SearchAsync(
            [FromQuery] string? name,
            [FromQuery] UserRole? role,

            [FromQuery] UserSortField? sortBy,
            [FromQuery] SortDirection? sort,

            [FromQuery] int? offset,
            [FromQuery] int? size,

            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            var page = await userService.SearchAsync(new()
            {
                Page = new(offset ?? 0, size ?? 20),
                Sort = sortBy.HasValue ? new(sortBy.Value, sort ?? SortDirection.Ascending) : null,
                Filter = new()
                {
                    Name = name,
                    Role = role
                }
            }, principal.ToUserContext(), ct);

            return Results.Ok(page.ToResponse(x => x.ToResponse()));
        }

        private static async Task<IResult> CreateAsync(
            CreateUserRequest request,
            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            var createdUser = await userService.CreateAsync(request, principal.ToUserContext(), ct);

            return Results.Created($"/api/users/{createdUser.Id}", createdUser.ToResponse());
        }

        private static async Task<IResult> UpdateAsync(
            UpdateUserRequest request,
            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            var updatedUser = await userService.UpdateAsync(request, principal.ToUserContext(), ct);

            return Results.Ok(updatedUser.ToResponse());
        }

        private static async Task<IResult> ChangePasswordAsync(
            ChangePasswordRequest request,
            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            await userService.ChangePasswordAsync(request, principal.ToUserContext(), ct);

            return Results.NoContent();
        }

        private static async Task<IResult> DeleteAsync(
            string userId,
            ClaimsPrincipal principal,
            IUserService userService,
            CancellationToken ct)
        {
            await userService.DeleteAsync(userId, principal.ToUserContext(), ct);

            return Results.NoContent();
        }
    }
}
