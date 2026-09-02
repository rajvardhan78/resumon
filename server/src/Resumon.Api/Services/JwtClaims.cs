namespace Resumon.Api.Services;

/// <summary>
/// Claim types used in the access token. Short OIDC-style names are deliberate: the JWT bearer
/// handler is configured with <c>MapInboundClaims = false</c> so what is written here is exactly
/// what shows up on <c>HttpContext.User</c>, keeping tokens compact and readable.
/// </summary>
public static class JwtClaims
{
    public const string Subject = "sub";
    public const string Email = "email";
    public const string Name = "name";
    public const string Role = "role";
    public const string TokenId = "jti";
}
