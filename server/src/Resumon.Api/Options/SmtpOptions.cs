namespace Resumon.Api.Options;

/// <summary>
/// SMTP settings for sending transactional emails (OTP codes, password resets).
/// Bound from the "Smtp" configuration section. When <see cref="IsConfigured"/> is false,
/// OTP codes are logged but not emailed — useful for local development.
/// </summary>
public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;

    public int Port { get; set; } = 587;

    public string Username { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string SenderEmail { get; set; } = "noreply@resumon.app";

    public string SenderName { get; set; } = "Resumon";

    public bool EnableSsl { get; set; } = true;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(Username);
}
