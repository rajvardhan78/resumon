using Microsoft.AspNetCore.Identity;
using MongoDB.Driver;
using Resumon.Api.Data;

namespace Resumon.Api.Identity;

/// <summary>
/// MongoDB-backed role store. Only the core <see cref="IRoleStore{TRole}"/> surface is needed —
/// roles carry no claims of their own in this application, authorization is role-name based.
/// </summary>
public sealed class MongoRoleStore(MongoContext context, IdentityErrorDescriber describer) : IRoleStore<ApplicationRole>
{
    private const int DuplicateKeyErrorCode = 11000;

    private IMongoCollection<ApplicationRole> Roles => context.Roles;

    public void Dispose()
    {
        // Nothing to release — the Mongo driver owns connection pooling.
    }

    public async Task<IdentityResult> CreateAsync(ApplicationRole role, CancellationToken cancellationToken)
    {
        try
        {
            await Roles.InsertOneAsync(role, cancellationToken: cancellationToken);
            return IdentityResult.Success;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == DuplicateKeyErrorCode)
        {
            return IdentityResult.Failed(describer.DuplicateRoleName(role.Name ?? string.Empty));
        }
    }

    public async Task<IdentityResult> UpdateAsync(ApplicationRole role, CancellationToken cancellationToken)
    {
        var expectedStamp = role.ConcurrencyStamp;
        role.ConcurrencyStamp = Guid.NewGuid().ToString();

        var filter = Builders<ApplicationRole>.Filter.And(
            Builders<ApplicationRole>.Filter.Eq(r => r.Id, role.Id),
            Builders<ApplicationRole>.Filter.Eq(r => r.ConcurrencyStamp, expectedStamp));

        try
        {
            var result = await Roles.ReplaceOneAsync(filter, role, cancellationToken: cancellationToken);
            if (result.MatchedCount == 0)
            {
                role.ConcurrencyStamp = expectedStamp;
                return IdentityResult.Failed(describer.ConcurrencyFailure());
            }

            return IdentityResult.Success;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == DuplicateKeyErrorCode)
        {
            role.ConcurrencyStamp = expectedStamp;
            return IdentityResult.Failed(describer.DuplicateRoleName(role.Name ?? string.Empty));
        }
    }

    public async Task<IdentityResult> DeleteAsync(ApplicationRole role, CancellationToken cancellationToken)
    {
        var result = await Roles.DeleteOneAsync(r => r.Id == role.Id, cancellationToken);
        return result.DeletedCount == 0
            ? IdentityResult.Failed(describer.ConcurrencyFailure())
            : IdentityResult.Success;
    }

    public Task<string> GetRoleIdAsync(ApplicationRole role, CancellationToken cancellationToken)
        => Task.FromResult(role.Id);

    public Task<string?> GetRoleNameAsync(ApplicationRole role, CancellationToken cancellationToken)
        => Task.FromResult(role.Name);

    public Task SetRoleNameAsync(ApplicationRole role, string? roleName, CancellationToken cancellationToken)
    {
        role.Name = roleName;
        return Task.CompletedTask;
    }

    public Task<string?> GetNormalizedRoleNameAsync(ApplicationRole role, CancellationToken cancellationToken)
        => Task.FromResult(role.NormalizedName);

    public Task SetNormalizedRoleNameAsync(ApplicationRole role, string? normalizedName, CancellationToken cancellationToken)
    {
        role.NormalizedName = normalizedName;
        return Task.CompletedTask;
    }

    public async Task<ApplicationRole?> FindByIdAsync(string roleId, CancellationToken cancellationToken)
    {
        if (!MongoContext.IsValidObjectId(roleId))
        {
            return null;
        }

        return await Roles.Find(r => r.Id == roleId).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ApplicationRole?> FindByNameAsync(string normalizedRoleName, CancellationToken cancellationToken)
        => await Roles.Find(r => r.NormalizedName == normalizedRoleName).FirstOrDefaultAsync(cancellationToken);
}
