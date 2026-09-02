using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Resumon.Api.Data;
using Resumon.Api.Identity;
using Resumon.Api.Options;
using Resumon.Api.Services;
using Resumon.Api.Services.Evaluation;
using Resumon.Api.Services.Gemini;
using Resumon.Api.Services.Scans;

var builder = WebApplication.CreateBuilder(args);

// Real secrets live outside source control: appsettings.Local.json for development, environment
// variables on Render. Both are optional so a fresh clone still starts.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Render (and most PaaS hosts) inject the port to listen on rather than letting the app pick.
if (Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } port)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddOptions<MongoOptions>()
    .Bind(builder.Configuration.GetSection(MongoOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection(GeminiOptions.SectionName));
builder.Services.Configure<UploadOptions>(builder.Configuration.GetSection(UploadOptions.SectionName));
builder.Services.Configure<ClientOptions>(builder.Configuration.GetSection(ClientOptions.SectionName));

const string ClientCorsPolicy = "client";

builder.Services.AddCors(cors => cors.AddPolicy(ClientCorsPolicy, policy =>
{
    var client = builder.Configuration.GetSection(ClientOptions.SectionName).Get<ClientOptions>() ?? new ClientOptions();

    policy.SetIsOriginAllowed(origin =>
        {
            if (client.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
            {
                return true;
            }

            // Vercel preview deployments: https://resumon-<hash>-<scope>.vercel.app
            return client.AllowVercelPreviews
                && Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                && uri.Scheme == Uri.UriSchemeHttps
                && uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
}));

builder.Services.AddSingleton<MongoContext>();
builder.Services.AddHostedService<MongoInitializer>();
builder.Services.AddSingleton(TimeProvider.System);

// SignInManager takes an IHttpContextAccessor even when only CheckPasswordSignInAsync is used.
builder.Services.AddHttpContextAccessor();

builder.Services
    .AddIdentityCore<ApplicationUser>(identity =>
    {
        identity.User.RequireUniqueEmail = true;
        identity.Password.RequiredLength = 8;
        identity.Password.RequireNonAlphanumeric = false;
        identity.Lockout.MaxFailedAccessAttempts = 8;
        identity.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
    })
    .AddRoles<ApplicationRole>()
    .AddSignInManager()
    .AddDefaultTokenProviders()
    .AddMongoStores();

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(bearer =>
    {
        // Keep the short claim names the token was minted with ("sub", "role") instead of letting
        // the handler rewrite them to the long WS-Federation URIs.
        bearer.MapInboundClaims = false;

        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtClaims.Subject,
            RoleClaimType = JwtClaims.Role,
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IScanRepository, ScanRepository>();
builder.Services.AddScoped<IResumeAnalysisService, ResumeAnalysisService>();
builder.Services.AddSingleton<IPdfTextExtractor, PdfPigTextExtractor>();

// Stateless and allocation-free per call, so one instance serves every request.
builder.Services.AddSingleton<IResumeEvaluator, LocalResumeEvaluator>();

builder.Services.AddHttpClient<IAiResumeAnalyzer, GeminiResumeAnalyzer>((services, http) =>
{
    var gemini = services.GetRequiredService<IOptions<GeminiOptions>>().Value;

    http.BaseAddress = new Uri(gemini.BaseUrl);
    http.Timeout = TimeSpan.FromSeconds(gemini.TimeoutSeconds);

    if (gemini.IsConfigured)
    {
        http.DefaultRequestHeaders.Add("x-goog-api-key", gemini.ApiKey);
    }
});

// PLACEHOLDER_SERVICES

// Two named limiters. "auth" blunts credential stuffing against the anonymous endpoints; "analyze"
// caps how fast one account can spend Gemini tokens.
builder.Services.AddRateLimiter(limiter =>
{
    limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    limiter.AddPolicy(RateLimitPolicies.Auth, context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
        }));

    limiter.AddPolicy(RateLimitPolicies.Analyze, context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirst(JwtClaims.Subject)?.Value
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 12,
            Window = TimeSpan.FromMinutes(5),
        }));
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var app = builder.Build();

// Render terminates TLS at its edge and forwards over plain HTTP, so the scheme and client IP have
// to come from the proxy headers — the rate limiter partitions on that IP.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();
app.UseCors(ClientCorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Liveness plus a real database round trip: Render's health check should fail if Atlas is
// unreachable, because every endpoint that matters would fail too.
app.MapGet("/health", async (MongoContext mongo, CancellationToken cancellationToken) =>
{
    try
    {
        await mongo.PingAsync(cancellationToken);

        return Results.Ok(new { status = "healthy", database = mongo.DatabaseName });
    }
    catch (Exception ex)
    {
        return Results.Json(
            new { status = "unhealthy", error = ex.Message },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}).AllowAnonymous();

app.Run();
