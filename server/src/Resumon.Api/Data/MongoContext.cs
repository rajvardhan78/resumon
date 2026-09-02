using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;
using Resumon.Api.Domain;
using Resumon.Api.Identity;
using Resumon.Api.Options;

namespace Resumon.Api.Data;

/// <summary>
/// Single place that owns the <see cref="IMongoClient"/> and exposes the typed collections.
/// Registered as a singleton: the driver pools connections internally and is thread-safe.
/// </summary>
public sealed class MongoContext
{
    private static int _conventionsRegistered;

    public MongoContext(IOptions<MongoOptions> options)
    {
        var settings = options.Value;
        RegisterConventions();

        var clientSettings = MongoClientSettings.FromConnectionString(settings.ConnectionString);
        clientSettings.ServerApi = new ServerApi(ServerApiVersion.V1);
        clientSettings.ConnectTimeout = TimeSpan.FromSeconds(30);
        clientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(30);
        clientSettings.SocketTimeout = TimeSpan.FromSeconds(30);
        clientSettings.ApplicationName = "resumon-api";

        Client = new MongoClient(clientSettings);

        // Prefer the database embedded in the connection string, fall back to configuration.
        var urlDatabase = MongoUrl.Create(settings.ConnectionString).DatabaseName;
        DatabaseName = string.IsNullOrWhiteSpace(urlDatabase) ? settings.Database : urlDatabase;
        Database = Client.GetDatabase(DatabaseName);

        Scans = Database.GetCollection<ScanDocument>(settings.ScansCollection);
        Users = Database.GetCollection<ApplicationUser>(settings.UsersCollection);
        Roles = Database.GetCollection<ApplicationRole>(settings.RolesCollection);
        RefreshTokens = Database.GetCollection<RefreshTokenDocument>(settings.RefreshTokensCollection);
    }

    public IMongoClient Client { get; }

    public IMongoDatabase Database { get; }

    public string DatabaseName { get; }

    public IMongoCollection<ScanDocument> Scans { get; }

    public IMongoCollection<ApplicationUser> Users { get; }

    public IMongoCollection<ApplicationRole> Roles { get; }

    public IMongoCollection<RefreshTokenDocument> RefreshTokens { get; }

    /// <summary>Round-trips a ping so startup can fail fast on a bad connection string.</summary>
    public Task PingAsync(CancellationToken cancellationToken = default)
        => Database.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1), cancellationToken: cancellationToken);

    /// <summary>
    /// Guards lookups by id. Every <c>_id</c> in this database is an ObjectId, so a value that
    /// is not one (a stale Clerk id, a hand-edited token) would throw during serialization
    /// instead of simply not matching.
    /// </summary>
    public static bool IsValidObjectId(string? value)
        => !string.IsNullOrWhiteSpace(value) && ObjectId.TryParse(value, out _);

    /// <summary>
    /// camelCase element names keep documents written by this API identical in shape to the
    /// ones the previous Node implementation wrote, so existing data stays readable.
    /// Ignoring extra elements means legacy documents with dropped fields still deserialize.
    /// </summary>
    private static void RegisterConventions()
    {
        if (Interlocked.Exchange(ref _conventionsRegistered, 1) == 1)
        {
            return;
        }

        ConventionRegistry.Register(
            "resumon",
            new ConventionPack
            {
                new CamelCaseElementNameConvention(),
                new IgnoreExtraElementsConvention(true),
            },
            _ => true);
    }
}
