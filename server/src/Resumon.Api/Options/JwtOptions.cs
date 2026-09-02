using System.ComponentModel.DataAnnotations;

namespace Resumon.Api.Options;

/// <summary>
/// Signing and lifetime settings for the access / refresh token pair issued by
/// <see cref="Services.JwtTokenService"/>. Bound from the "Jwt" configuration section.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>Minimum key length enforced at startup — HS256 needs at least 256 bits of entropy.</summary>
    public const int MinimumKeyLength = 32;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Jwt:Key is required (set Jwt__Key).")]
    [MinLength(MinimumKeyLength, ErrorMessage = "Jwt:Key must be at least 32 characters long.")]
    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = "resumon-api";

    public string Audience { get; set; } = "resumon-client";

    /// <summary>Access token lifetime. Short-lived; the client silently refreshes.</summary>
    [Range(1, 24 * 60)]
    public int AccessTokenMinutes { get; set; } = 60;

    /// <summary>Refresh token lifetime. Rotated on every use.</summary>
    [Range(1, 365)]
    public int RefreshTokenDays { get; set; } = 30;
}
