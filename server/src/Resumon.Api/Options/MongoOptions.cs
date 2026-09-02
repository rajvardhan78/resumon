using System.ComponentModel.DataAnnotations;

namespace Resumon.Api.Options;

/// <summary>
/// MongoDB Atlas connection settings. Bound from the "Mongo" configuration section.
/// </summary>
public sealed class MongoOptions
{
    public const string SectionName = "Mongo";

    /// <summary>
    /// Full connection string, e.g. mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/resumon
    /// </summary>
    [Required(AllowEmptyStrings = false, ErrorMessage = "Mongo:ConnectionString is required (set MONGODB_URI or Mongo__ConnectionString).")]
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>Database name. Falls back to "resumon" when the URI carries no default database.</summary>
    public string Database { get; set; } = "resumon";

    public string ScansCollection { get; set; } = "scans";

    public string UsersCollection { get; set; } = "users";

    public string RolesCollection { get; set; } = "roles";

    public string RefreshTokensCollection { get; set; } = "refreshTokens";

    public string OtpTokensCollection { get; set; } = "otpTokens";
}
