using System.Text.Json.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace Resumon.Api.Contracts.Analysis;

/// <summary>
/// Score, prose feedback and highlight chips for one of the four resume dimensions.
/// </summary>
public sealed class DimensionScore
{
    [JsonPropertyName("score")]
    public int Score { get; set; }

    [JsonPropertyName("feedback")]
    public string Feedback { get; set; } = string.Empty;

    [JsonPropertyName("highlights")]
    public List<string> Highlights { get; set; } = [];
}

/// <summary>The four scoring dimensions. Property order matches the original Node engine.</summary>
public sealed class AnalysisScores
{
    [JsonPropertyName("keywords")]
    public DimensionScore Keywords { get; set; } = new();

    [JsonPropertyName("experience")]
    public DimensionScore Experience { get; set; } = new();

    [JsonPropertyName("knowledgeDepth")]
    public DimensionScore KnowledgeDepth { get; set; } = new();

    [JsonPropertyName("creativity")]
    public DimensionScore Creativity { get; set; } = new();

    /// <summary>Dimensions in the canonical order used for tie-breaking and summaries.</summary>
    public IEnumerable<(string Key, DimensionScore Value)> InOrder()
    {
        yield return ("keywords", Keywords);
        yield return ("experience", Experience);
        yield return ("knowledgeDepth", KnowledgeDepth);
        yield return ("creativity", Creativity);
    }
}

/// <summary>
/// Analysis payload returned to the client and embedded in the persisted scan document.
/// The JSON shape is byte-compatible with the previous Node/Vercel implementation so the
/// React pages render unchanged.
/// </summary>
public sealed class ResumeAnalysis
{
    [JsonPropertyName("overallScore")]
    public int OverallScore { get; set; }

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("scores")]
    public AnalysisScores Scores { get; set; } = new();

    [JsonPropertyName("topStrengths")]
    public List<string> TopStrengths { get; set; } = [];

    [JsonPropertyName("improvements")]
    public List<string> Improvements { get; set; } = [];

    /// <summary>
    /// "gemini" or "local" — drives the badge on the results page. Serialized as
    /// <c>_source</c> in JSON (matching the old API) and <c>source</c> in BSON
    /// (matching the existing scans collection).
    /// </summary>
    [JsonPropertyName("_source")]
    [BsonElement("source")]
    public string Source { get; set; } = AnalysisSource.Local;
}

public static class AnalysisSource
{
    public const string Gemini = "gemini";
    public const string Local = "local";
}
