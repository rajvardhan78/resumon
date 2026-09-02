namespace Resumon.Api.Options;

/// <summary>
/// Cloudflare Turnstile bot-verification settings. Bound from the "Turnstile" configuration
/// section. When <see cref="IsConfigured"/> is false, verification is skipped — useful for
/// local development without a Turnstile widget.
/// </summary>
public sealed class TurnstileOptions
{
    public const string SectionName = "Turnstile";

    public string SiteKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    public string VerifyUrl { get; set; } = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
}
