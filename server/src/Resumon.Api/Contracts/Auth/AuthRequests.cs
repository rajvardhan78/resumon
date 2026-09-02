using System.ComponentModel.DataAnnotations;

namespace Resumon.Api.Contracts.Auth;

/// <summary>Sign-up payload. Email doubles as the Identity user name.</summary>
public sealed class RegisterRequest
{
    [Required(AllowEmptyStrings = false)]
    [StringLength(80, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Length is checked here so the client gets a field-level error; complexity rules live in
    /// the Identity password options and surface as a list of validation messages.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Verification code is required.")]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Verification code must be 6 digits.")]
    public string Otp { get; set; } = string.Empty;
}

/// <summary>Sign-in payload.</summary>
public sealed class LoginRequest
{
    [Required(AllowEmptyStrings = false)]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    [StringLength(128)]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Exchanges a refresh token for a fresh access/refresh pair.</summary>
public sealed class RefreshRequest
{
    [Required(AllowEmptyStrings = false)]
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>Optional body on sign-out — lets the client retire its refresh token too.</summary>
public sealed class LogoutRequest
{
    public string? RefreshToken { get; set; }
}

/// <summary>Requires the user to re-authenticate before permanently deleting their account.</summary>
public sealed class DeleteAccountRequest
{
    [Required(AllowEmptyStrings = false)]
    [StringLength(128)]
    public string Password { get; set; } = string.Empty;
}

public sealed class SendOtpRequest
{
    [Required(AllowEmptyStrings = false)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? TurnstileToken { get; set; }
}

public sealed class ForgotPasswordRequest
{
    [Required(AllowEmptyStrings = false)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public sealed class VerifyResetOtpRequest
{
    [Required(AllowEmptyStrings = false)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Verification code is required.")]
    public string Otp { get; set; } = string.Empty;
}

public sealed class ResetPasswordRequest
{
    [Required(AllowEmptyStrings = false)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string ResetToken { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}
