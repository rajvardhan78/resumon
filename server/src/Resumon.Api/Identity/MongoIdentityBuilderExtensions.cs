using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Resumon.Api.Identity;

/// <summary>
/// Wires the MongoDB stores into the Identity builder, mirroring how
/// <c>AddEntityFrameworkStores</c> is used on the EF Core provider.
/// </summary>
public static class MongoIdentityBuilderExtensions
{
    /// <summary>
    /// Registers <see cref="MongoUserStore"/> and <see cref="MongoRoleStore"/> for the
    /// <see cref="ApplicationUser"/>/<see cref="ApplicationRole"/> pair.
    /// </summary>
    public static IdentityBuilder AddMongoStores(this IdentityBuilder builder)
    {
        if (builder.UserType != typeof(ApplicationUser))
        {
            throw new InvalidOperationException(
                $"The Mongo stores only support '{nameof(ApplicationUser)}', but Identity was configured with '{builder.UserType.Name}'.");
        }

        if (builder.RoleType != typeof(ApplicationRole))
        {
            throw new InvalidOperationException(
                $"The Mongo stores only support '{nameof(ApplicationRole)}', but Identity was configured with '{builder.RoleType?.Name ?? "no role type"}'.");
        }

        builder.Services.TryAddScoped<IUserStore<ApplicationUser>, MongoUserStore>();
        builder.Services.TryAddScoped<IRoleStore<ApplicationRole>, MongoRoleStore>();

        return builder;
    }
}
