using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Entities;
using SqlSugar;

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
        // P1 Hardening：避免隐性 IN（Contains）；改为 EXISTS（子查询）。
        var roles = await _roles.GetListAsync(
            r => SqlFunc.Subqueryable<SysUserRole>()
                .Where(ur => ur.UserId == userId && ur.RoleId == r.Id)
                .Any(),
            cancellationToken);

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
