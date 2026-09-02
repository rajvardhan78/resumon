using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Resumon.Api.Identity;

/// <summary>Role document backing <c>RoleManager&lt;ApplicationRole&gt;</c>.</summary>
public class ApplicationRole
{
    public const string User = "User";
    public const string Admin = "Admin";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string? Name { get; set; }

    public string? NormalizedName { get; set; }

    public string? ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();

    public ApplicationRole()
    {
    }

    public ApplicationRole(string name)
    {
        Name = name;
    }
}
