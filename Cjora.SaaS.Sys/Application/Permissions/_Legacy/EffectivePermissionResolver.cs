using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 基于 <see cref="SysUserRole"/> + <see cref="SysRolePermission"/> + <see cref="SysPermission"/> 计算有效权限码。
/// </summary>
public sealed class EffectivePermissionResolver : IEffectivePermissionResolver
{
    private readonly IRepository<SysPermission> _permissions;
    private readonly IRepository<SysUserRole> _userRoles;
    private readonly IRepository<SysRolePermission> _rolePermissions;

    public EffectivePermissionResolver(
        IRepository<SysPermission> permissions,
        IRepository<SysUserRole> userRoles,
        IRepository<SysRolePermission> rolePermissions)
    {
        _permissions = permissions;
        _userRoles = userRoles;
        _rolePermissions = rolePermissions;
    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default)
    {
        var permCodes = await _permissions.GetListAsync(
            p => p.PermCode != null
                 && p.PermCode != ""
                 && p.IsActive
                 && SqlFunc.Subqueryable<SysRolePermission>()
                     .Where(rp => rp.PermissionId == p.Id
                                  && SqlFunc.Subqueryable<SysUserRole>()
                                      .Where(ur => ur.UserId == userId && ur.RoleId == rp.RoleId)
                                      .Any())
                     .Any(),
            cancellationToken);

        return permCodes
            .Select(p => p.PermCode!)
            .ToHashSet(StringComparer.Ordinal);
    }

    /// <summary>
    /// 获取用户可见的菜单权限节点 Id 集合（含 menu 和 button 类型）。
    /// </summary>
    public async Task<IReadOnlySet<long>> GetEffectivePermissionIdsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var perms = await _permissions.GetListAsync(
            p => p.IsActive
                 && SqlFunc.Subqueryable<SysRolePermission>()
                     .Where(rp => rp.PermissionId == p.Id
                                  && SqlFunc.Subqueryable<SysUserRole>()
                                      .Where(ur => ur.UserId == userId && ur.RoleId == rp.RoleId)
                                      .Any())
                     .Any(),
            cancellationToken);

        return perms.Select(p => p.Id).ToHashSet();
    }
}
