namespace Resumon.Api.Options;

/// <summary>
/// Browser clients allowed to call the API. Bound from the "Client" configuration section.
/// </summary>
/// <remarks>
/// The Node version answered every origin with <c>Access-Control-Allow-Origin: *</c>. That is not
/// an option here: the API now carries credentials, and a wildcard origin would let any site spend
/// a signed-in user's session. Production sets this to the Vercel URL.
/// </remarks>
public sealed class ClientOptions
{
    public const string SectionName = "Client";

    /// <summary>Exact origins (scheme + host + port), no trailing slash.</summary>
    public string[] AllowedOrigins { get; set; } = [];

    /// <summary>
    /// Also allow any <c>*.vercel.app</c> origin. Preview deployments get a new hostname on every
    /// push, so pinning them one by one is not practical.
    /// </summary>
    public bool AllowVercelPreviews { get; set; } = true;
}
