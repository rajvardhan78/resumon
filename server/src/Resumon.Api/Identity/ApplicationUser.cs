using System.Security.Claims;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Resumon.Api.Identity;

/// <summary>
/// Application user persisted in the Mongo "users" collection. Property names mirror
/// the ASP.NET Core Identity contract so <c>UserManager</c> and <c>SignInManager</c>
/// behave exactly as they do on the EF Core stores.
/// </summary>
public class ApplicationUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string? UserName { get; set; }

    public string? NormalizedUserName { get; set; }

    public string? Email { get; set; }

    public string? NormalizedEmail { get; set; }

    public bool EmailConfirmed { get; set; }

    public string? PasswordHash { get; set; }

    public string? SecurityStamp { get; set; }

    public string? ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();

    public bool TwoFactorEnabled { get; set; }

    public DateTimeOffset? LockoutEnd { get; set; }

    public bool LockoutEnabled { get; set; } = true;

    public int AccessFailedCount { get; set; }

    // ── Application-specific profile ────────────────────────────────────────────

    /// <summary>Display name shown in the sidebar and on the profile page.</summary>
    public string? FullName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginAt { get; set; }

    /// <summary>Normalized role names the user belongs to.</summary>
    public List<string> Roles { get; set; } = [];

    public List<UserClaimRecord> Claims { get; set; } = [];
}

/// <summary>A single persisted claim on an <see cref="ApplicationUser"/>.</summary>
public sealed class UserClaimRecord
{
    public string Type { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    public Claim ToClaim() => new(Type, Value);

    public static UserClaimRecord FromClaim(Claim claim) => new() { Type = claim.Type, Value = claim.Value };
}
