using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using MongoDB.Driver;
using Resumon.Api.Data;

namespace Resumon.Api.Identity;

/// <summary>
/// MongoDB-backed ASP.NET Core Identity user store.
/// <para>
/// Implementing the store interfaces directly (rather than pulling in a third-party Mongo
/// Identity package) keeps the dependency surface small and means <c>UserManager</c>,
/// <c>SignInManager</c>, the password hasher, the validators and lockout all work exactly as
/// they do on the EF Core provider.
/// </para>
/// <para>
/// Mutating methods follow the Identity contract: setters only touch the in-memory entity and
/// <see cref="UpdateAsync"/> is what persists, using <see cref="ApplicationUser.ConcurrencyStamp"/>
/// for optimistic concurrency.
/// </para>
/// </summary>
public sealed class MongoUserStore(MongoContext context, IdentityErrorDescriber describer) :
    IUserStore<ApplicationUser>,
    IUserPasswordStore<ApplicationUser>,
    IUserEmailStore<ApplicationUser>,
    IUserSecurityStampStore<ApplicationUser>,
    IUserLockoutStore<ApplicationUser>,
    IUserRoleStore<ApplicationUser>,
    IUserClaimStore<ApplicationUser>,
    IUserTwoFactorStore<ApplicationUser>
{
    private const int DuplicateKeyErrorCode = 11000;

    private IMongoCollection<ApplicationUser> Users => context.Users;

    public void Dispose()
    {
        // Nothing to release — the Mongo driver owns connection pooling.
    }

    // ─── IUserStore ────────────────────────────────────────────────────────────

    public Task<string> GetUserIdAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.Id);

    public Task<string?> GetUserNameAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.UserName);

    public Task SetUserNameAsync(ApplicationUser user, string? userName, CancellationToken cancellationToken)
    {
        user.UserName = userName;
        return Task.CompletedTask;
    }

    public Task<string?> GetNormalizedUserNameAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.NormalizedUserName);

    public Task SetNormalizedUserNameAsync(ApplicationUser user, string? normalizedName, CancellationToken cancellationToken)
    {
        user.NormalizedUserName = normalizedName;
        return Task.CompletedTask;
    }

    public async Task<IdentityResult> CreateAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        try
        {
            await Users.InsertOneAsync(user, cancellationToken: cancellationToken);
            return IdentityResult.Success;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == DuplicateKeyErrorCode)
        {
            return IdentityResult.Failed(DescribeDuplicate(ex.WriteError.Message, user));
        }
    }

    /// <summary>
    /// Replaces the document, but only if the stored <c>concurrencyStamp</c> still matches the
    /// one this instance was loaded with — the same optimistic-concurrency guarantee the EF
    /// Core store gets from a rowversion column.
    /// </summary>
    public async Task<IdentityResult> UpdateAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var expectedStamp = user.ConcurrencyStamp;
        user.ConcurrencyStamp = Guid.NewGuid().ToString();

        var filter = Builders<ApplicationUser>.Filter.And(
            Builders<ApplicationUser>.Filter.Eq(u => u.Id, user.Id),
            Builders<ApplicationUser>.Filter.Eq(u => u.ConcurrencyStamp, expectedStamp));

        try
        {
            var result = await Users.ReplaceOneAsync(filter, user, cancellationToken: cancellationToken);
            if (result.MatchedCount == 0)
            {
                user.ConcurrencyStamp = expectedStamp;
                return IdentityResult.Failed(describer.ConcurrencyFailure());
            }

            return IdentityResult.Success;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == DuplicateKeyErrorCode)
        {
            user.ConcurrencyStamp = expectedStamp;
            return IdentityResult.Failed(DescribeDuplicate(ex.WriteError.Message, user));
        }
    }

    public async Task<IdentityResult> DeleteAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var result = await Users.DeleteOneAsync(u => u.Id == user.Id, cancellationToken);
        return result.DeletedCount == 0
            ? IdentityResult.Failed(describer.ConcurrencyFailure())
            : IdentityResult.Success;
    }

    public async Task<ApplicationUser?> FindByIdAsync(string userId, CancellationToken cancellationToken)
    {
        // Ids are ObjectId-backed; a malformed value would otherwise throw on serialization.
        if (!MongoContext.IsValidObjectId(userId))
        {
            return null;
        }

        return await Users.Find(u => u.Id == userId).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ApplicationUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken)
        => await Users.Find(u => u.NormalizedUserName == normalizedUserName).FirstOrDefaultAsync(cancellationToken);

    /// <summary>
    /// Maps a duplicate-key write error onto the Identity error the caller expects. The index
    /// name is the only reliable discriminator, so fall back to a username clash when a future
    /// index rename makes the message unrecognisable.
    /// </summary>
    private IdentityError DescribeDuplicate(string message, ApplicationUser user)
        => message.Contains("normalizedEmail", StringComparison.OrdinalIgnoreCase)
            ? describer.DuplicateEmail(user.Email ?? string.Empty)
            : describer.DuplicateUserName(user.UserName ?? string.Empty);

    // ─── IUserPasswordStore ────────────────────────────────────────────────────

    public Task SetPasswordHashAsync(ApplicationUser user, string? passwordHash, CancellationToken cancellationToken)
    {
        user.PasswordHash = passwordHash;
        return Task.CompletedTask;
    }

    public Task<string?> GetPasswordHashAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.PasswordHash);

    public Task<bool> HasPasswordAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(!string.IsNullOrEmpty(user.PasswordHash));

    // ─── IUserEmailStore ───────────────────────────────────────────────────────

    public Task SetEmailAsync(ApplicationUser user, string? email, CancellationToken cancellationToken)
    {
        user.Email = email;
        return Task.CompletedTask;
    }

    public Task<string?> GetEmailAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.Email);

    public Task<bool> GetEmailConfirmedAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.EmailConfirmed);

    public Task SetEmailConfirmedAsync(ApplicationUser user, bool confirmed, CancellationToken cancellationToken)
    {
        user.EmailConfirmed = confirmed;
        return Task.CompletedTask;
    }

    public async Task<ApplicationUser?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken)
        => await Users.Find(u => u.NormalizedEmail == normalizedEmail).FirstOrDefaultAsync(cancellationToken);

    public Task<string?> GetNormalizedEmailAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.NormalizedEmail);

    public Task SetNormalizedEmailAsync(ApplicationUser user, string? normalizedEmail, CancellationToken cancellationToken)
    {
        user.NormalizedEmail = normalizedEmail;
        return Task.CompletedTask;
    }

    // ─── IUserSecurityStampStore ───────────────────────────────────────────────

    public Task SetSecurityStampAsync(ApplicationUser user, string stamp, CancellationToken cancellationToken)
    {
        user.SecurityStamp = stamp;
        return Task.CompletedTask;
    }

    public Task<string?> GetSecurityStampAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.SecurityStamp);

    // ─── IUserLockoutStore ─────────────────────────────────────────────────────

    public Task<DateTimeOffset?> GetLockoutEndDateAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.LockoutEnd);

    public Task SetLockoutEndDateAsync(ApplicationUser user, DateTimeOffset? lockoutEnd, CancellationToken cancellationToken)
    {
        user.LockoutEnd = lockoutEnd;
        return Task.CompletedTask;
    }

    public Task<int> IncrementAccessFailedCountAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(++user.AccessFailedCount);

    public Task ResetAccessFailedCountAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        user.AccessFailedCount = 0;
        return Task.CompletedTask;
    }

    public Task<int> GetAccessFailedCountAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.AccessFailedCount);

    public Task<bool> GetLockoutEnabledAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.LockoutEnabled);

    public Task SetLockoutEnabledAsync(ApplicationUser user, bool enabled, CancellationToken cancellationToken)
    {
        user.LockoutEnabled = enabled;
        return Task.CompletedTask;
    }

    // ─── IUserRoleStore ────────────────────────────────────────────────────────
    // UserManager always hands these methods the *normalized* role name, so that is what the
    // embedded `roles` array stores. GetRolesAsync resolves them back to display names.

    public async Task AddToRoleAsync(ApplicationUser user, string roleName, CancellationToken cancellationToken)
    {
        var role = await context.Roles.Find(r => r.NormalizedName == roleName).FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException($"Role '{roleName}' does not exist.");

        if (!user.Roles.Contains(role.NormalizedName!, StringComparer.Ordinal))
        {
            user.Roles.Add(role.NormalizedName!);
        }
    }

    public Task RemoveFromRoleAsync(ApplicationUser user, string roleName, CancellationToken cancellationToken)
    {
        user.Roles.RemoveAll(r => string.Equals(r, roleName, StringComparison.OrdinalIgnoreCase));
        return Task.CompletedTask;
    }

    public async Task<IList<string>> GetRolesAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        if (user.Roles.Count == 0)
        {
            return [];
        }

        var roles = await context.Roles
            .Find(Builders<ApplicationRole>.Filter.In(r => r.NormalizedName, user.Roles))
            .ToListAsync(cancellationToken);

        // Preserve the order stored on the user, and keep any role whose document has since
        // been deleted so a stale membership is still visible rather than silently vanishing.
        return user.Roles
            .Select(normalized => roles.FirstOrDefault(r => r.NormalizedName == normalized)?.Name ?? normalized)
            .ToList();
    }

    public Task<bool> IsInRoleAsync(ApplicationUser user, string roleName, CancellationToken cancellationToken)
        => Task.FromResult(user.Roles.Any(r => string.Equals(r, roleName, StringComparison.OrdinalIgnoreCase)));

    public async Task<IList<ApplicationUser>> GetUsersInRoleAsync(string roleName, CancellationToken cancellationToken)
        => await Users.Find(Builders<ApplicationUser>.Filter.AnyEq(u => u.Roles, roleName)).ToListAsync(cancellationToken);

    // ─── IUserClaimStore ───────────────────────────────────────────────────────

    public Task<IList<Claim>> GetClaimsAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult<IList<Claim>>(user.Claims.Select(c => c.ToClaim()).ToList());

    public Task AddClaimsAsync(ApplicationUser user, IEnumerable<Claim> claims, CancellationToken cancellationToken)
    {
        foreach (var claim in claims)
        {
            if (!user.Claims.Any(c => c.Type == claim.Type && c.Value == claim.Value))
            {
                user.Claims.Add(UserClaimRecord.FromClaim(claim));
            }
        }

        return Task.CompletedTask;
    }

    public Task ReplaceClaimAsync(ApplicationUser user, Claim claim, Claim newClaim, CancellationToken cancellationToken)
    {
        foreach (var existing in user.Claims.Where(c => c.Type == claim.Type && c.Value == claim.Value))
        {
            existing.Type = newClaim.Type;
            existing.Value = newClaim.Value;
        }

        return Task.CompletedTask;
    }

    public Task RemoveClaimsAsync(ApplicationUser user, IEnumerable<Claim> claims, CancellationToken cancellationToken)
    {
        foreach (var claim in claims)
        {
            user.Claims.RemoveAll(c => c.Type == claim.Type && c.Value == claim.Value);
        }

        return Task.CompletedTask;
    }

    public async Task<IList<ApplicationUser>> GetUsersForClaimAsync(Claim claim, CancellationToken cancellationToken)
    {
        var filter = Builders<ApplicationUser>.Filter.ElemMatch(
            u => u.Claims,
            c => c.Type == claim.Type && c.Value == claim.Value);

        return await Users.Find(filter).ToListAsync(cancellationToken);
    }

    // ─── IUserTwoFactorStore ───────────────────────────────────────────────────
    // Not surfaced in the UI, but SignInManager probes it on every sign-in.

    public Task SetTwoFactorEnabledAsync(ApplicationUser user, bool enabled, CancellationToken cancellationToken)
    {
        user.TwoFactorEnabled = enabled;
        return Task.CompletedTask;
    }

    public Task<bool> GetTwoFactorEnabledAsync(ApplicationUser user, CancellationToken cancellationToken)
        => Task.FromResult(user.TwoFactorEnabled);
}
