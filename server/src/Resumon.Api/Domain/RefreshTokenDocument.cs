using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Resumon.Api.Domain;

/// <summary>
/// A refresh token issued to a signed-in client. Only the SHA-256 hash of the token is
/// stored, so a database dump cannot be replayed against the API. Tokens are rotated on
/// every use: the consumed document is marked revoked and points at its replacement.
/// </summary>
public sealed class RefreshTokenDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Base64 SHA-256 hash of the opaque token handed to the client.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    /// <summary>Hash of the token that replaced this one during rotation.</summary>
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive(DateTime utcNow) => RevokedAt is null && ExpiresAt > utcNow;
}
