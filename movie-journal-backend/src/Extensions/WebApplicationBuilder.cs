using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;
using MovieJournalBackend.Repositories;
using MovieJournalBackend.Repositories.Common;
using MovieJournalBackend.Repositories.Implementation;
using MovieJournalBackend.Services;
using MovieJournalBackend.Services.Auth;
using MovieJournalBackend.Services.Implementation;
using MovieJournalBackend.Settings;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;

namespace MovieJournalBackend.Extensions
{
    public static class WebApplicationBuilderExtensions
    {
        public static void AddCors(this WebApplicationBuilder builder)
        {
            var allowAnyOrigin = builder.Configuration.GetValue<bool>("CorsSettings:AllowAnyOrigin");
            var corsOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() ?? [];

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("DefaultCorsPolicy", policy =>
                {
                    policy.AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();

                    if (allowAnyOrigin)
                    {
                        policy.SetIsOriginAllowed(_ => true);
                    }
                    else
                    {
                        if (corsOrigins.Length > 0)
                        {
                            policy.WithOrigins(corsOrigins);
                        }
                    }
                });
            });
        }

        public static void AddAuth(this WebApplicationBuilder builder)
        {
            builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(nameof(JwtSettings)));

            builder.Services.AddSingleton<IJwtService, JwtService>();
            builder.Services.AddSingleton<IPasswordService, PasswordService>();

            var jwtSettings = builder.Configuration.GetSection(nameof(JwtSettings)).Get<JwtSettings>()!;

            builder.Services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new()
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateIssuerSigningKey = true,
                        ValidateLifetime = true,
                        ValidIssuer = jwtSettings.Issuer,
                        ValidAudience = jwtSettings.Audience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
                    };
                });

            builder.Services.AddAuthorization();
        }

        public static void AddDatabase(this WebApplicationBuilder builder)
        {
            builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection(nameof(MongoDbSettings)));
            builder.Services.Configure<AdminSeedSettings>(builder.Configuration.GetSection(nameof(AdminSeedSettings)));

            var pack = new ConventionPack
            {
                new EnumRepresentationConvention(BsonType.String)
            };

            ConventionRegistry.Register("EnumStringConvention", pack, t => true);

            builder.Services.AddSingleton<IMongoClient>(sp =>
            {
                var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;

                return new MongoClient(settings.ConnectionString);
            });

            builder.Services.AddSingleton(sp =>
            {
                var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
                var client = sp.GetRequiredService<IMongoClient>();

                return client.GetDatabase(settings.DatabaseName);
            });

            builder.Services.AddSingleton<MongoDbIndexInitializer>();
            builder.Services.AddSingleton<Seeder>();
        }

        public static void AddRepositories(this WebApplicationBuilder builder)
        {
            builder.Services.AddSingleton<IActorRepository, ActorRepository>();
            builder.Services.AddSingleton<IMediaCollectionRepository, MediaCollectionRepository>();
            builder.Services.AddSingleton<IMediaRepository, MediaRepository>();
            builder.Services.AddSingleton<IUserRepository, UserRepository>();
            builder.Services.AddSingleton<IUserWatchingRepository, UserWatchingRepository>();
        }

        public static void AddServices(this WebApplicationBuilder builder)
        {
            builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
            {
                options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
            builder.Services.AddSingleton<IUserIdProvider, UserIdProvider>();

            builder.Services.AddSingleton<IAuthService, AuthService>();
            builder.Services.AddSingleton<IActorService, ActorService>();
            builder.Services.AddSingleton<IMediaCollectionService, MediaCollectionService>();
            builder.Services.AddSingleton<IMediaRelationshipService, MediaRelationshipService>();
            builder.Services.AddSingleton<IMediaService, MediaService>();
            builder.Services.AddSingleton<IRealtimeService, RealtimeService>();
            builder.Services.AddSingleton<IUserService, UserService>();
            builder.Services.AddSingleton<IUserWatchingService, UserWatchingService>();
        }

        public sealed class UserIdProvider : IUserIdProvider
        {
            public string? GetUserId(HubConnectionContext connection) =>
                connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        public static void AddOpenApi(this WebApplicationBuilder builder)
        {
            builder.Services.AddOpenApi(options =>
            {
                options.AddDocumentTransformer((doc, _, _) => ConfigureOpenApiDocument(doc));
            });
        }

        private static Task ConfigureOpenApiDocument(OpenApiDocument document)
        {
            document.Components ??= new();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
            {
                Name = HeaderNames.Authorization,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header
            };

            return Task.CompletedTask;
        }

    }
}
