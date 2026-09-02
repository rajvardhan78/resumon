using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using Resumon.Api.Contracts.Auth;
using Resumon.Api.Identity;
using Resumon.Api.Services;
using Resumon.Api.Services.Scans;

namespace Resumon.Api.Controllers;

/// <summary>
/// Email + password authentication on ASP.NET Core Identity, replacing Clerk. Access tokens are
/// short-lived JWTs; the rotating refresh token is what keeps a session alive.
/// </summary>
[Route("api/auth")]
[EnableRateLimiting(RateLimitPolicies.Auth)]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ITokenService tokenService,
    IScanRepository scanRepository,
    IOtpService otpService,
    ITurnstileService turnstileService,
    IEmailService emailService,
    TimeProvider timeProvider,
    ILogger<AuthController> logger) : ApiControllerBase
{
    /// <summary>Creates an account and signs it straight in, so sign-up needs one round trip.</summary>
    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();

        var otpValid = await otpService.ValidateAsync(email, request.Otp, "signup", cancellationToken);
        if (!otpValid)
        {
            ModelState.AddModelError(nameof(request.Otp), "Invalid or expired verification code.");
            return ValidationProblem(ModelState);
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = request.FullName.Trim(),
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
        };

        var created = await userManager.CreateAsync(user, request.Password);

        if (!created.Succeeded)
        {
            return ValidationProblem(ToModelState(created));
        }

        await AssignDefaultRoleAsync(user);

        logger.LogInformation("Registered user {UserId}.", user.Id);

        return Created(string.Empty, await SignInAsync(user, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("send-otp")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendOtp(SendOtpRequest request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var validTurnstile = await turnstileService.VerifyAsync(request.TurnstileToken, remoteIp, cancellationToken);

        if (!validTurnstile)
        {
            return BadRequest(new ErrorResponse("Bot verification failed. Please try again."));
        }

        var email = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);

        if (user is not null)
        {
            // Since the Register endpoint ultimately reveals if an email is taken, it's better UX 
            // to fail early here so the user isn't endlessly waiting for an OTP email.
            return BadRequest(new ErrorResponse("An account with this email already exists."));
        }

        try
        {
            var otp = await otpService.GenerateAndStoreAsync(email, "signup", cancellationToken);
            await emailService.SendOtpAsync(email, otp, "signup", cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponse(ex.Message));
        }
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);

        if (user is null)
        {
            // Do not leak whether the email is registered.
            return NoContent();
        }

        try
        {
            var otp = await otpService.GenerateAndStoreAsync(email, "password-reset", cancellationToken);
            await emailService.SendOtpAsync(email, otp, "password-reset", cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponse(ex.Message));
        }
    }

    [AllowAnonymous]
    [HttpPost("verify-reset-otp")]
    [ProducesResponseType<object>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyResetOtp(VerifyResetOtpRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        var otpValid = await otpService.ValidateAsync(email, request.Otp, "password-reset", cancellationToken);

        if (!otpValid)
        {
            return BadRequest(new ErrorResponse("Invalid or expired verification code."));
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return BadRequest(new ErrorResponse("Account not found."));
        }

        // Generate a password reset token. In a real app this might be emailed, but here we verified the OTP.
        // Return it to the client so they can send it in the reset-password request.
        var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);

        return Ok(new { ResetToken = resetToken });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var email = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);

        if (user is null)
        {
            ModelState.AddModelError(nameof(request.Email), "Account not found.");
            return ValidationProblem(ModelState);
        }

        var result = await userManager.ResetPasswordAsync(user, request.ResetToken, request.NewPassword);

        if (!result.Succeeded)
        {
            return ValidationProblem(ToModelState(result));
        }

        return NoContent();
    }

    /// <summary>
    /// Verifies the password through <see cref="SignInManager{TUser}"/> so lockout counters and the
    /// password-hash upgrade path behave the same as on a stock Identity app.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        if (user is null)
        {
            // Same message and roughly the same work as a wrong password, so the response cannot
            // be used to enumerate which addresses have accounts.
            return Unauthorized(new ErrorResponse("Incorrect email or password."));
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            return Unauthorized(new ErrorResponse("Too many failed attempts. Try again in a few minutes."));
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new ErrorResponse("Incorrect email or password."));
        }

        return Ok(await SignInAsync(user, cancellationToken));
    }

    /// <summary>
    /// Trades a refresh token for a new pair. The presented token is invalidated even on success,
    /// so a stolen copy is only useful until the real client next refreshes.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken cancellationToken)
    {
        var rotated = await tokenService.RotateAsync(request.RefreshToken, cancellationToken);

        if (rotated is null)
        {
            return Unauthorized(new ErrorResponse("Your session has expired. Please sign in again."));
        }

        return Ok(new AuthResponse(UserResponse.From(rotated.User, rotated.Roles), rotated.Tokens));
    }

    /// <summary>
    /// Retires the caller's refresh token. Anonymous on purpose: an expired access token must not
    /// stop a client from cleaning up its session.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(LogoutRequest? request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request?.RefreshToken))
        {
            await tokenService.RevokeAsync(request.RefreshToken, cancellationToken);
        }

        return NoContent();
    }

    /// <summary>Signs out every device by revoking the whole refresh-token family.</summary>
    [Authorize]
    [HttpPost("logout-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LogoutEverywhere(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        await tokenService.RevokeAllAsync(userId, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// The current profile. This is what replaces Clerk's <c>useUser()</c>: the client calls it once
    /// on boot to rehydrate the session from a stored refresh token.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> Me()
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        var user = await userManager.FindByIdAsync(userId);

        if (user is null)
        {
            // Token still valid but the account is gone — treat it as signed out.
            return Unauthorized(new ErrorResponse("Your account could not be found."));
        }

        return Ok(UserResponse.From(user, await RolesOfAsync(user)));
    }

    /// <summary>
    /// Permanently deletes the authenticated user's account and all associated data.
    /// Requires re-authentication via password to prevent accidental or unauthorized deletion.
    /// </summary>
    [Authorize]
    [HttpPost("delete-account")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        var user = await userManager.FindByIdAsync(userId);

        if (user is null)
        {
            return Unauthorized(new ErrorResponse("Your account could not be found."));
        }

        // Re-authenticate: the password must be valid before we nuke everything.
        var check = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);

        if (!check.Succeeded)
        {
            return Unauthorized(new ErrorResponse("Incorrect password. Account deletion cancelled."));
        }

        // Delete all user data: scans, refresh tokens, then the user document itself.
        await scanRepository.DeleteAllForUserAsync(userId, cancellationToken);
        await tokenService.RevokeAllAsync(userId, cancellationToken);
        await userManager.DeleteAsync(user);

        logger.LogInformation("Permanently deleted account {UserId}.", userId);

        return NoContent();
    }

    /// <summary>
    /// Puts every new account in the <c>User</c> role. Non-fatal: the role is seeded at startup, so
    /// the only way this fails is a database problem, and that should not lose a created account.
    /// </summary>
    private async Task AssignDefaultRoleAsync(ApplicationUser user)
    {
        try
        {
            var result = await userManager.AddToRoleAsync(user, ApplicationRole.User);

            if (!result.Succeeded)
            {
                logger.LogWarning(
                    "Could not add user {UserId} to the default role: {Errors}",
                    user.Id,
                    string.Join("; ", result.Errors.Select(e => e.Description)));
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not add user {UserId} to the default role.", user.Id);
        }
    }

    /// <summary>Stamps the login time and mints the token pair.</summary>
    private async Task<AuthResponse> SignInAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        user.LastLoginAt = timeProvider.GetUtcNow().UtcDateTime;

        // Best effort: a concurrency clash here should not fail an otherwise valid sign-in.
        await userManager.UpdateAsync(user);

        var roles = await RolesOfAsync(user);
        var tokens = await tokenService.IssueAsync(user, roles, cancellationToken);

        return new AuthResponse(UserResponse.From(user, roles), tokens);
    }

    private async Task<IReadOnlyList<string>> RolesOfAsync(ApplicationUser user)
        => [.. await userManager.GetRolesAsync(user)];

    /// <summary>
    /// Projects Identity errors onto the request fields so the sign-up form can highlight the
    /// offending input instead of showing a bare list.
    /// </summary>
    private ModelStateDictionary ToModelState(IdentityResult result)
    {
        var seen = new HashSet<(string Key, string Message)>();

        foreach (var error in result.Errors)
        {
            var key = error.Code switch
            {
                "DuplicateUserName" or "DuplicateEmail" or "InvalidEmail" or "InvalidUserName"
                    => nameof(RegisterRequest.Email),
                var code when code.StartsWith("Password", StringComparison.Ordinal)
                    => nameof(RegisterRequest.Password),
                _ => string.Empty,
            };

            // Email doubles as the user name, so a taken address trips both duplicate checks.
            // Collapse them into the one sentence the form should show.
            var message = error.Code is "DuplicateUserName" or "DuplicateEmail"
                ? "An account with this email already exists."
                : error.Description;

            if (seen.Add((key, message)))
            {
                ModelState.AddModelError(key, message);
            }
        }

        return ModelState;
    }
}
