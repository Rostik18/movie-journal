using MovieJournalBackend.Repositories.Common;

namespace MovieJournalBackend.Extensions
{
    public static class AppExtensions
    {
        public static async Task RunOnServiceStart(this WebApplication app)
        {
            await app.Services.GetRequiredService<MongoDbIndexInitializer>().InitializeAsync();
            await app.Services.GetRequiredService<Seeder>().SeedAsync();
        }
    }
}