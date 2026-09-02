using MongoDB.Driver;
using Resumon.Api.Contracts.Analysis;
using Resumon.Api.Data;
using Resumon.Api.Domain;
using Resumon.Api.Services.Evaluation;

namespace Resumon.Api.Services.Scans;

/// <summary>Reads and writes the "scans" collection.</summary>
public interface IScanRepository
{
    /// <summary>
    /// Persists a scan. Returns <c>false</c> when the write failed — the caller still returns the
    /// analysis, matching the original API, which logged insert failures and carried on.
    /// </summary>
    Task<bool> AddAsync(ScanDocument scan, CancellationToken cancellationToken);

    Task<IReadOnlyList<ScanHistoryItem>> GetHistoryAsync(string userId, int limit, CancellationToken cancellationToken);

    Task<ScanStats> GetStatsAsync(string userId, CancellationToken cancellationToken);

    /// <summary>The most recent scan, so a page refresh can restore the results view.</summary>
    Task<ScanDocument?> GetLatestAsync(string userId, CancellationToken cancellationToken);

    /// <summary>Permanently removes all scans for a user (used when deleting the account).</summary>
    Task DeleteAllForUserAsync(string userId, CancellationToken cancellationToken);
}

public sealed class ScanRepository(MongoContext context, ILogger<ScanRepository> logger) : IScanRepository
{
    public const int DefaultHistoryLimit = 20;
    public const int MaxHistoryLimit = 100;

    public async Task<bool> AddAsync(ScanDocument scan, CancellationToken cancellationToken)
    {
        try
        {
            await context.Scans.InsertOneAsync(scan, cancellationToken: cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to persist scan for user {UserId}.", scan.UserId);
            return false;
        }
    }

    public async Task<IReadOnlyList<ScanHistoryItem>> GetHistoryAsync(
        string userId,
        int limit,
        CancellationToken cancellationToken)
    {
        var documents = await context.Scans
            .Find(ByUser(userId))
            .SortByDescending(s => s.ScannedAt)
            .Limit(Math.Clamp(limit, 1, MaxHistoryLimit))
            .ToListAsync(cancellationToken);

        return [.. documents.Select(ScanHistoryItem.From)];
    }

    public async Task<ScanStats> GetStatsAsync(string userId, CancellationToken cancellationToken)
    {
        // One $group over the user's rows — the same aggregation the Node API ran, so the tiles
        // show identical numbers for data written by either version.
        var aggregate = await context.Scans
            .Aggregate()
            .Match(ByUser(userId))
            .Group(
                s => s.UserId,
                g => new ScanStatsAccumulator
                {
                    TotalScans = g.Count(),
                    AverageScore = g.Average(s => s.Overall),
                    BestScore = g.Max(s => s.Overall),
                    LastScannedAt = g.Max(s => s.ScannedAt),
                })
            .FirstOrDefaultAsync(cancellationToken);

        return aggregate is null
            ? ScanStats.Empty
            : new ScanStats(
                aggregate.TotalScans,
                // JS Math.round, not banker's rounding: an average of 76.5 has always shown as 77.
                TextHeuristics.JsRound(aggregate.AverageScore),
                aggregate.BestScore,
                aggregate.LastScannedAt);
    }

    public Task<ScanDocument?> GetLatestAsync(string userId, CancellationToken cancellationToken)
        => context.Scans
            .Find(ByUser(userId))
            .SortByDescending(s => s.ScannedAt)
            .Limit(1)
            .FirstOrDefaultAsync(cancellationToken)!;

    public async Task DeleteAllForUserAsync(string userId, CancellationToken cancellationToken)
    {
        var result = await context.Scans.DeleteManyAsync(ByUser(userId), cancellationToken);
        logger.LogInformation("Deleted {Count} scan(s) for user {UserId}.", result.DeletedCount, userId);
    }

    private static FilterDefinition<ScanDocument> ByUser(string userId)
        => Builders<ScanDocument>.Filter.Eq(s => s.UserId, userId);
}

/// <summary>Shape of the <c>$group</c> stage behind <see cref="ScanStats"/>.</summary>
internal sealed class ScanStatsAccumulator
{
    public int TotalScans { get; set; }

    public double AverageScore { get; set; }

    public int BestScore { get; set; }

    public DateTime LastScannedAt { get; set; }
}
