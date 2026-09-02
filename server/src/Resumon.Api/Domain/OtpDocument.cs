using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Resumon.Api.Domain;

/// <summary>
/// A one-time-password document stored in the "otpTokens" collection.
/// The OTP is stored as a SHA-256 hash so a database leak doesn't hand out valid codes.
/// A TTL index on <see cref="ExpiresAt"/> auto-deletes expired entries.
/// </summary>
public sealed class OtpDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    /// <summary>Normalised email address the OTP was sent to.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>SHA-256 hash of the 6-digit OTP.</summary>
    public string OtpHash { get; set; } = string.Empty;

    /// <summary>"signup" or "password-reset".</summary>
    public string Purpose { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>After this point the OTP is invalid and the TTL index will remove the document.</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Set to true once the OTP has been successfully validated.</summary>
    public bool Consumed { get; set; }
}
