namespace MovieJournalBackend.Endpoints
{
    public static class ServiceEndpoints
    {
        public static IEndpointRouteBuilder MapServiceEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/service/status", GetStatusAsync).Produces<string>().AllowAnonymous();

            return app;
        }

        private static async Task<IResult> GetStatusAsync(CancellationToken ct)
        {
            return Results.Ok("Alive");
        }
    }
}
