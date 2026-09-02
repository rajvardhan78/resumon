using Microsoft.AspNetCore.Identity;
using MongoDB.Driver;
using Resumon.Api.Domain;
using Resumon.Api.Identity;

namespace Resumon.Api.Data;

/// <summary>
/// Startup task that verifies connectivity, creates the indexes the API relies on and seeds
/// the default roles. Index creation is idempotent, so this is safe to run on every boot.
/// </summary>
/// <remarks>
/// Failures are logged rather than thrown: a transient Atlas hiccup during a Render deploy
/// should not put the service into a crash loop. <c>/health</c> reports the real state.
/// </remarks>
public sealed class MongoInitializer(
    MongoContext context,
    IServiceProvider services,
    ILogger<MongoInitializer> logger) : IHostedService
{
    private const int MaxAttempts = 3;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                await context.PingAsync(cancellationToken);
                logger.LogInformation("Connected to MongoDB database '{Database}'.", context.DatabaseName);

                await CreateIndexesAsync(cancellationToken);
                await SeedRolesAsync(cancellationToken);
                return;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (attempt < MaxAttempts)
            {
                var delay = TimeSpan.FromSeconds(2 * attempt);
                logger.LogWarning(ex, "MongoDB initialization attempt {Attempt} failed; retrying in {Delay}.", attempt, delay);
                await Task.Delay(delay, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogCritical(ex, "MongoDB initialization failed after {Attempts} attempts. The API will start but database-backed endpoints will fail.", MaxAttempts);
                return;
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task CreateIndexesAsync(CancellationToken cancellationToken)
    {
        // Serves both the history listing and the stats aggregation.
        await context.Scans.Indexes.CreateOneAsync(
            new CreateIndexModel<ScanDocument>(
                Builders<ScanDocument>.IndexKeys.Ascending(s => s.UserId).Descending(s => s.ScannedAt),
                new CreateIndexOptions { Name = "userId_scannedAt_desc" }),
            cancellationToken: cancellationToken);

        await context.Users.Indexes.CreateManyAsync(
            [
                new CreateIndexModel<ApplicationUser>(
                    Builders<ApplicationUser>.IndexKeys.Ascending(u => u.NormalizedEmail),
                    new CreateIndexOptions { Name = "normalizedEmail_unique", Unique = true, Sparse = true }),
                new CreateIndexModel<ApplicationUser>(
                    Builders<ApplicationUser>.IndexKeys.Ascending(u => u.NormalizedUserName),
                    new CreateIndexOptions { Name = "normalizedUserName_unique", Unique = true, Sparse = true }),
            ],
            cancellationToken);

        await context.Roles.Indexes.CreateOneAsync(
            new CreateIndexModel<ApplicationRole>(
                Builders<ApplicationRole>.IndexKeys.Ascending(r => r.NormalizedName),
                new CreateIndexOptions { Name = "normalizedName_unique", Unique = true, Sparse = true }),
            cancellationToken: cancellationToken);

        await context.RefreshTokens.Indexes.CreateManyAsync(
            [
                new CreateIndexModel<RefreshTokenDocument>(
                    Builders<RefreshTokenDocument>.IndexKeys.Ascending(t => t.TokenHash),
                    new CreateIndexOptions { Name = "tokenHash_unique", Unique = true }),
                new CreateIndexModel<RefreshTokenDocument>(
                    Builders<RefreshTokenDocument>.IndexKeys.Ascending(t => t.UserId),
                    new CreateIndexOptions { Name = "userId" }),
                // Sweep spent tokens a week after they expire — long enough to inspect a
                // rotation chain while investigating, short enough to keep the collection small.
                new CreateIndexModel<RefreshTokenDocument>(
                    Builders<RefreshTokenDocument>.IndexKeys.Ascending(t => t.ExpiresAt),
                    new CreateIndexOptions { Name = "expiresAt_ttl", ExpireAfter = TimeSpan.FromDays(7) }),
            ],
            cancellationToken);

        await context.OtpTokens.Indexes.CreateOneAsync(
            new CreateIndexModel<OtpDocument>(
                Builders<OtpDocument>.IndexKeys.Ascending(t => t.ExpiresAt),
                new CreateIndexOptions { Name = "expiresAt_ttl", ExpireAfter = TimeSpan.Zero }),
            cancellationToken: cancellationToken);

        logger.LogInformation("MongoDB indexes verified.");
    }

    private async Task SeedRolesAsync(CancellationToken cancellationToken)
    {
        using var scope = services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

        foreach (var role in new[] { ApplicationRole.User, ApplicationRole.Admin })
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (await roleManager.RoleExistsAsync(role))
            {
                continue;
            }

            var result = await roleManager.CreateAsync(new ApplicationRole(role));
            if (result.Succeeded)
            {
                logger.LogInformation("Seeded role '{Role}'.", role);
            }
            else
            {
                logger.LogWarning("Could not seed role '{Role}': {Errors}", role, string.Join("; ", result.Errors.Select(e => e.Description)));
            }
        }
    }
}
