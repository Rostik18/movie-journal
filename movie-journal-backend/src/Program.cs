using MovieJournalBackend;
using MovieJournalBackend.Endpoints;
using MovieJournalBackend.Extensions;
using MovieJournalBackend.Hubs;
using Scalar.AspNetCore;

var builder = WebApplication.CreateSlimBuilder(args);

builder.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.AddAuth();
builder.AddDatabase();
builder.AddRepositories();
builder.AddServices();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTheme(ScalarTheme.Purple).WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

await app.RunOnServiceStart();

app.UseCors("AllowAll");

app.UseMiddleware<ExceptionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapHub<UserHub>("/hubs/user");

app.MapAuthEndpoints();
app.MapActorEndpoints();
app.MapMediaCollectionEndpoints();
app.MapMediaEndpoints();
app.MapUserEndpoints();
app.MapUserWatchingEndpoints();

app.Run();
