namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 在 Scoped 生命周期内临时关闭行级数据权限过滤（部门 / 本人），用于受控运维或后台任务。
/// </summary>
/// <remarks>
/// <para>
/// <b>// NEW</b>：不影响租户级 <see cref="Cjora.SaaS.Core.Repository.Abstractions.ITenantScopedEntity"/> 全局过滤器；仅跳过
/// <see cref="IDataPermissionContext"/> 驱动的部门与本人条件。嵌套 <see cref="Disable"/> 使用引用计数，线程安全。
/// </para>
/// </remarks>
public interface IDataPermissionScope
{
    /// <summary>
    /// 在 <c>using</c> 作用域内关闭数据权限行级过滤器；释放时恢复。
    /// </summary>
    IDisposable Disable();
}
