using System.Text.Json.Serialization;
using Resumon.Api.Domain;

namespace Resumon.Api.Contracts.Analysis;

/// <summary>
/// One row on the history page. Field names match what the previous Node API returned, so
/// <c>History.jsx</c> and <c>Analytics.jsx</c> keep working untouched.
/// </summary>
public sealed record ScanHistoryItem(
    string Id,
    string FileName,
    DateTime ScannedAt,
    int Overall,
    int Keywords,
    int Experience,
    int Knowledge,
    int Creativity,
    string Source)
{
    public static ScanHistoryItem From(ScanDocument scan) => new(
        scan.Id,
        scan.FileName,
        scan.ScannedAt,
        scan.Overall,
        scan.Keywords,
        scan.Experience,
        scan.Knowledge,
        scan.Creativity,
        scan.Source);
}

/// <summary>Aggregates behind the dashboard tiles.</summary>
public sealed record ScanStats(int TotalScans, int AverageScore, int BestScore, DateTime? LastScannedAt)
{
    public static ScanStats Empty { get; } = new(0, 0, 0, null);
}

/// <summary>
/// Analyze envelope. <c>_usedFallback</c> is present only when Gemini was unavailable and the
/// in-house engine scored the resume — the client shows a subtle badge for it, and its absence
/// on the happy path is part of the original contract.
/// </summary>
public sealed record AnalyzeResponse(
    ResumeAnalysis Analysis,
    [property: JsonPropertyName("_usedFallback")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    bool? UsedFallback)
{
    public bool Success => true;
}

public sealed record HistoryResponse(IReadOnlyList<ScanHistoryItem> Scans)
{
    public bool Success => true;
}

public sealed record StatsResponse(ScanStats Stats)
{
    public bool Success => true;
}
