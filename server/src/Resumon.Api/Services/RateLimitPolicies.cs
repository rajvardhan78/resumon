namespace Resumon.Api.Services;

/// <summary>Names of the rate-limiting policies configured in <c>Program.cs</c>.</summary>
public static class RateLimitPolicies
{
    /// <summary>Per-IP limit on the anonymous auth endpoints.</summary>
    public const string Auth = "auth";

    /// <summary>Per-user limit on resume analysis, which costs a Gemini call.</summary>
    public const string Analyze = "analyze";
}
