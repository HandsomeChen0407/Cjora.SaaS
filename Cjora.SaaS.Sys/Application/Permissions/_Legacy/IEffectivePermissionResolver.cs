namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 根据用户已分配角色，解析其有效权限码集合（多角色权限并集）。
/// </summary>
public interface IEffectivePermissionResolver
{
    /// <summary>
    /// 返回指定用户在当前租户下的有效权限码（PermCode）集合。
    /// </summary>
    Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 返回指定用户在当前租户下的有效权限节点 Id 集合。
    /// </summary>
    Task<IReadOnlySet<long>> GetEffectivePermissionIdsAsync(long userId, CancellationToken cancellationToken = default);
}
