using MovieJournalBackend.Contracts.Auth;
using MovieJournalBackend.Services.Auth;

namespace MovieJournalBackend.Endpoints
{
    public static class AuthEndpoints
    {
        public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapPost("/api/auth/login", LoginAsync).AllowAnonymous();

            return app;
        }

        private static async Task<IResult> LoginAsync(
            LoginRequest request,
            IAuthService authService,
            CancellationToken ct)
        {
            var result = await authService.LoginAsync(request, ct);

            return Results.Ok(result);
        }
    }
}
