namespace Resumon.Api.Options;

/// <summary>
/// Google Gemini (AI Studio) settings. Bound from the "Gemini" configuration section.
/// When <see cref="ApiKey"/> is blank the analyzer skips Gemini entirely and the
/// in-house scoring engine handles every request.
/// </summary>
public sealed class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Generative Language model id. Kept in configuration because Google retires
    /// model aliases regularly — swapping this needs no redeploy of code.
    /// </summary>
    public string Model { get; set; } = "gemini-3.6-flash";

    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/";

    /// <summary>Low temperature keeps scoring reproducible across runs.</summary>
    public double Temperature { get; set; } = 0.2;

    /// <summary>Hard timeout for a single generateContent call.</summary>
    public int TimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// Resume text longer than this is truncated before being sent upstream — guards
    /// against a pathological PDF blowing up token spend.
    /// </summary>
    public int MaxResumeCharacters { get; set; } = 24_000;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
