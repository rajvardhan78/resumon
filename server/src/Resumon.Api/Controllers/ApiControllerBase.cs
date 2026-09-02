using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Resumon.Api.Services;

namespace Resumon.Api.Controllers;

/// <summary>
/// Shared plumbing for the authenticated endpoints.
/// <para>
/// The important detail is <see cref="CurrentUserId"/>: every user-scoped query takes its id from
/// the signed access token. The Node version read <c>userId</c> from a form field, which let any
/// caller write scans into — and read stats out of — another account.
/// </para>
/// </summary>
[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>The authenticated user's id, or <c>null</c> on an anonymous request.</summary>
    protected string? CurrentUserId
        => User.FindFirstValue(JwtClaims.Subject) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

    /// <summary>
    /// 401 for a token that carries no subject — possible only if a token was minted elsewhere.
    /// </summary>
    protected ActionResult MissingSubject()
        => Unauthorized(new ErrorResponse("Your session is no longer valid. Please sign in again."));
}

/// <summary>
/// Error envelope. Single <c>error</c> string, exactly what the previous API returned and what the
/// React pages already display.
/// </summary>
public sealed record ErrorResponse(string Error);
