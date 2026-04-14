using Cjora.SaaS.Core.Repository;
using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 基于 <see cref="SysUserRole"/> 与 <see cref="SysRole.PermissionCodesJson"/> 计算有效权限码。
/// </summary>
public sealed class EffectivePermissionResolver : IEffectivePermissionResolver
{
    private readonly IRepository<SysRole> _roles;
    private readonly IRepository<SysUserRole> _userRoles;

    /// <summary>
    /// 初始化 <see cref="EffectivePermissionResolver"/>。
    /// </summary>
    /// <param name="roles">角色仓储。</param>
    /// <param name="userRoles">用户角色仓储。</param>
    public EffectivePermissionResolver(IRepository<SysRole> roles, IRepository<SysUserRole> userRoles)
    {
        _roles = roles;
        _userRoles = userRoles;
    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default)
    {
        var links = await _userRoles.GetListAsync(ur => ur.UserId == userId, cancellationToken);
        if (links.Count == 0)
        {
            return new HashSet<string>(StringComparer.Ordinal);
        }

        var roleIds = links.Select(static l => l.RoleId).Distinct().ToArray();
        var roles = await _roles.GetListAsync(r => roleIds.Contains(r.Id), cancellationToken);

        var set = new HashSet<string>(StringComparer.Ordinal);
        foreach (var role in roles)
        {
            foreach (var code in PermissionCodesSerializer.Parse(role.PermissionCodesJson))
            {
                set.Add(code);
            }
        }

        return set;
    }
}
