using Resumon.Api.Contracts.Auth;
using Resumon.Api.Identity;

namespace Resumon.Api.Services;

/// <summary>Issues, rotates and revokes the access / refresh token pair.</summary>
public interface ITokenService
{
    /// <summary>Mints a new pair and persists the refresh token hash.</summary>
    Task<TokenPair> IssueAsync(ApplicationUser user, IReadOnlyList<string> roles, CancellationToken cancellationToken = default);

    /// <summary>
    /// Consumes a refresh token and returns a fresh pair, or <c>null</c> when the token is
    /// unknown, expired or already spent.
    /// </summary>
    Task<RefreshResult?> RotateAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>Revokes a single refresh token. Silently ignores unknown values.</summary>
    Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>Revokes every active refresh token for a user (sign-out everywhere).</summary>
    Task RevokeAllAsync(string userId, CancellationToken cancellationToken = default);
}

/// <summary>The user behind a rotated token, plus the replacement pair.</summary>
public sealed record RefreshResult(ApplicationUser User, IReadOnlyList<string> Roles, TokenPair Tokens);
