namespace Resumon.Api.Options;

/// <summary>Limits applied to resume uploads. Bound from the "Upload" configuration section.</summary>
public sealed class UploadOptions
{
    public const string SectionName = "Upload";

    /// <summary>Maximum accepted PDF size in bytes.</summary>
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Shortest extraction result we will attempt to score. Matches the original
    /// Node implementation so image-only scans are rejected with the same message.
    /// </summary>
    public int MinimumTextLength { get; set; } = 50;
}
