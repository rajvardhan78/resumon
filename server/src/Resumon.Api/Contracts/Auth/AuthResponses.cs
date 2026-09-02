using Resumon.Api.Identity;

namespace Resumon.Api.Contracts.Auth;

/// <summary>
/// The signed-in user as the React app sees it. Shaped to replace the fields the pages used to
/// read off Clerk's <c>useUser()</c> hook (<c>fullName</c>, e-mail, <c>createdAt</c>).
/// </summary>
public sealed record UserResponse(
    string Id,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles,
    DateTime CreatedAt,
    DateTime? LastLoginAt)
{
    public static UserResponse From(ApplicationUser user, IReadOnlyList<string> roles) => new(
        user.Id,
        user.Email ?? string.Empty,
        // Fall back to the local part of the e-mail so the sidebar never renders an empty name.
        string.IsNullOrWhiteSpace(user.FullName)
            ? (user.Email ?? string.Empty).Split('@')[0]
            : user.FullName,
        roles,
        user.CreatedAt,
        user.LastLoginAt);
}

/// <summary>
/// Access token plus the opaque refresh token. The access token is short-lived and kept in
/// memory by the client; the refresh token is what survives a page reload.
/// </summary>
public sealed record TokenPair(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt);

/// <summary>Response for register, login and refresh.</summary>
public sealed record AuthResponse(UserResponse User, TokenPair Tokens);
