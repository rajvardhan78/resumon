using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using Resumon.Api.Contracts.Auth;
using Resumon.Api.Data;
using Resumon.Api.Domain;
using Resumon.Api.Identity;
using Resumon.Api.Options;

namespace Resumon.Api.Services;

/// <summary>
/// HS256 access tokens paired with opaque, rotating refresh tokens.
/// <para>
/// Refresh tokens are random 256-bit values stored only as a SHA-256 hash. Each use is
/// atomically marked revoked and linked to its replacement, which means a token replayed after
/// rotation is detectable: that only happens if it leaked, so the whole family is dropped.
/// </para>
/// </summary>
public sealed class JwtTokenService(
    MongoContext context,
    IOptions<JwtOptions> options,
    TimeProvider timeProvider,
    ILogger<JwtTokenService> logger) : ITokenService
{
    private const int RefreshTokenBytes = 32;

    private readonly JwtOptions _options = options.Value;
    private readonly JsonWebTokenHandler _handler = new();
    private readonly SigningCredentials _credentials = new(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Value.Key)),
        SecurityAlgorithms.HmacSha256);

    public async Task<TokenPair> IssueAsync(
        ApplicationUser user,
        IReadOnlyList<string> roles,
        CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var refreshToken = CreateRefreshToken();

        await context.RefreshTokens.InsertOneAsync(
            new RefreshTokenDocument
            {
                UserId = user.Id,
                TokenHash = Hash(refreshToken),
                CreatedAt = now,
                ExpiresAt = now.AddDays(_options.RefreshTokenDays),
            },
            cancellationToken: cancellationToken);

        return BuildPair(user, roles, refreshToken, now);
    }

    public async Task<RefreshResult?> RotateAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var presentedHash = Hash(refreshToken);
        var replacement = CreateRefreshToken();
        var replacementHash = Hash(replacement);

        // One round trip claims the token and records its successor. Doing it as a single
        // findAndModify means two concurrent refreshes can never both succeed.
        var consumed = await context.RefreshTokens.FindOneAndUpdateAsync(
            Builders<RefreshTokenDocument>.Filter.And(
                Builders<RefreshTokenDocument>.Filter.Eq(t => t.TokenHash, presentedHash),
                Builders<RefreshTokenDocument>.Filter.Eq(t => t.RevokedAt, null),
                Builders<RefreshTokenDocument>.Filter.Gt(t => t.ExpiresAt, now)),
            Builders<RefreshTokenDocument>.Update
                .Set(t => t.RevokedAt, now)
                .Set(t => t.ReplacedByTokenHash, replacementHash),
            new FindOneAndUpdateOptions<RefreshTokenDocument> { ReturnDocument = ReturnDocument.After },
            cancellationToken);

        if (consumed is null)
        {
            await DetectReplayAsync(presentedHash, now, cancellationToken);
            return null;
        }

        var user = await context.Users.Find(u => u.Id == consumed.UserId).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            // The account was deleted while the session was alive.
            return null;
        }

        await context.RefreshTokens.InsertOneAsync(
            new RefreshTokenDocument
            {
                UserId = user.Id,
                TokenHash = replacementHash,
                CreatedAt = now,
                ExpiresAt = now.AddDays(_options.RefreshTokenDays),
            },
            cancellationToken: cancellationToken);

        var roles = await ResolveRoleNamesAsync(user, cancellationToken);
        return new RefreshResult(user, roles, BuildPair(user, roles, replacement, now));
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;

        await context.RefreshTokens.UpdateOneAsync(
            Builders<RefreshTokenDocument>.Filter.And(
                Builders<RefreshTokenDocument>.Filter.Eq(t => t.TokenHash, Hash(refreshToken)),
                Builders<RefreshTokenDocument>.Filter.Eq(t => t.RevokedAt, null)),
            Builders<RefreshTokenDocument>.Update.Set(t => t.RevokedAt, now),
            cancellationToken: cancellationToken);
    }

    public async Task RevokeAllAsync(string userId, CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;

        await context.RefreshTokens.UpdateManyAsync(
            Builders<RefreshTokenDocument>.Filter.And(
                Builders<RefreshTokenDocument>.Filter.Eq(t => t.UserId, userId),
                Builders<RefreshTokenDocument>.Filter.Eq(t => t.RevokedAt, null)),
            Builders<RefreshTokenDocument>.Update.Set(t => t.RevokedAt, now),
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// A presented token that exists but is already spent means the value leaked — the
    /// legitimate client would have moved on to its replacement. Drop every live token for the
    /// account so both the attacker and the victim have to sign in again.
    /// </summary>
    private async Task DetectReplayAsync(string presentedHash, DateTime now, CancellationToken cancellationToken)
    {
        var spent = await context.RefreshTokens
            .Find(t => t.TokenHash == presentedHash)
            .FirstOrDefaultAsync(cancellationToken);

        if (spent is null || spent.ExpiresAt <= now)
        {
            return;
        }

        logger.LogWarning(
            "Refresh token replay detected for user {UserId}; revoking all active tokens.",
            spent.UserId);

        await RevokeAllAsync(spent.UserId, cancellationToken);
    }

    private TokenPair BuildPair(ApplicationUser user, IReadOnlyList<string> roles, string refreshToken, DateTime now)
    {
        var accessExpires = now.AddMinutes(_options.AccessTokenMinutes);

        var claims = new Dictionary<string, object>
        {
            [JwtClaims.Subject] = user.Id,
            [JwtClaims.Email] = user.Email ?? string.Empty,
            [JwtClaims.Name] = user.FullName ?? user.UserName ?? string.Empty,
            [JwtClaims.TokenId] = Guid.NewGuid().ToString("N"),
        };

        if (roles.Count > 0)
        {
            claims[JwtClaims.Role] = roles;
        }

        var accessToken = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = accessExpires,
            Claims = claims,
            SigningCredentials = _credentials,
        });

        return new TokenPair(accessToken, accessExpires, refreshToken, now.AddDays(_options.RefreshTokenDays));
    }

    /// <summary>Maps the normalized role names stored on the user back to their display names.</summary>
    private async Task<IReadOnlyList<string>> ResolveRoleNamesAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        if (user.Roles.Count == 0)
        {
            return [];
        }

        var roles = await context.Roles
            .Find(Builders<ApplicationRole>.Filter.In(r => r.NormalizedName, user.Roles))
            .ToListAsync(cancellationToken);

        return user.Roles
            .Select(normalized => roles.FirstOrDefault(r => r.NormalizedName == normalized)?.Name ?? normalized)
            .ToList();
    }

    private static string CreateRefreshToken()
        => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(RefreshTokenBytes));

    private static string Hash(string token)
        => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
