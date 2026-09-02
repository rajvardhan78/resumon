using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Resumon.Api.Contracts.Analysis;

namespace Resumon.Api.Domain;

/// <summary>
/// One resume scan persisted in the "scans" collection.
/// <para>
/// The flat numeric columns (<see cref="Overall"/> … <see cref="Creativity"/>) are kept for
/// cheap aggregation on the stats endpoint and match the field names written by the previous
/// Node implementation. <see cref="Analysis"/> is new: storing the full payload lets the
/// history and analytics pages be served from the database instead of localStorage.
/// </para>
/// </summary>
public sealed class ScanDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    public string FileName { get; set; } = "resume.pdf";

    public DateTime ScannedAt { get; set; } = DateTime.UtcNow;

    public int Overall { get; set; }

    public int Keywords { get; set; }

    public int Experience { get; set; }

    public int Knowledge { get; set; }

    public int Creativity { get; set; }

    /// <summary>"gemini" or "local".</summary>
    public string Source { get; set; } = AnalysisSource.Local;

    /// <summary>Full analysis payload. Null for rows written by the legacy Node API.</summary>
    [BsonIgnoreIfNull]
    public ResumeAnalysis? Analysis { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static ScanDocument FromAnalysis(string userId, string fileName, ResumeAnalysis analysis, DateTime scannedAtUtc)
        => new()
        {
            UserId = userId,
            FileName = fileName,
            ScannedAt = scannedAtUtc,
            Overall = analysis.OverallScore,
            Keywords = analysis.Scores.Keywords.Score,
            Experience = analysis.Scores.Experience.Score,
            Knowledge = analysis.Scores.KnowledgeDepth.Score,
            Creativity = analysis.Scores.Creativity.Score,
            Source = analysis.Source,
            Analysis = analysis,
            CreatedAt = DateTime.UtcNow,
        };
}
