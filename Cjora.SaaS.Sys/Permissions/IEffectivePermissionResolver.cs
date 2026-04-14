namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 根据用户已分配角色，解析其有效权限码集合（多角色权限并集）。
/// </summary>
public interface IEffectivePermissionResolver
{
    /// <summary>
    /// 返回指定用户在当前租户下的有效权限码；用户无角色或角色无权限码时返回空集合。
    /// </summary>
    /// <param name="userId"><see cref="Entities.SysUser"/> 的 <see cref="Entities.SysLongIdTenantAuditedEntity.Id"/>。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>去重后的权限码集合。</returns>
    Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default);
}
