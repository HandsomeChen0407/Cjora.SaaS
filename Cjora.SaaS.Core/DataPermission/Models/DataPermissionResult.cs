using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Core.DataPermission.Models;

/// <summary>
/// 一次解析得到的数据权限快照，由 <see cref="Abstractions.IDataPermissionResolver"/> 产出、供 <see cref="Abstractions.IDataPermissionContext"/> 作为只读视图暴露。
/// </summary>
/// <remarks>
/// <para>
/// 将「解析策略」与「运行时上下文接口」分离的目的：宿主可替换 Resolver（例如从数据库/缓存加载 RBAC 结果），
/// 而 SqlSugar 全局过滤器与业务代码仍只依赖稳定的 <see cref="Abstractions.IDataPermissionContext"/>，避免大面积改动。
/// </para>
/// <para>
/// 本类型为不可变值对象；同一 Scoped 请求内 <see cref="Abstractions.IDataPermissionResolver.Resolve"/> 应返回语义一致的结果。
/// </para>
/// </remarks>
public sealed class DataPermissionResult
{
    /// <summary>
    /// 初始化 <see cref="DataPermissionResult"/>。
    /// </summary>
    /// <param name="scope">数据范围。</param>
    /// <param name="bypassRowLevelFilters">是否跳过部门/本人行级过滤器。</param>
    /// <param name="currentUserId">当前用户 Id。</param>
    /// <param name="accessibleDepartmentIds">部门范围模式下可访问的部门 Id 列表。</param>
    public DataPermissionResult(
        DataScopeKind scope,
        bool bypassRowLevelFilters,
        long currentUserId,
        IReadOnlyList<long> accessibleDepartmentIds)
    {
        Scope = scope;
        BypassRowLevelFilters = bypassRowLevelFilters;
        CurrentUserId = currentUserId;
        AccessibleDepartmentIds = accessibleDepartmentIds;
    }

    /// <summary>数据范围（与 <c>IDataPermissionContext.Scope</c> 语义一致）。</summary>
    public DataScopeKind Scope { get; }

    /// <summary>是否跳过部门/本人行级过滤器。</summary>
    public bool BypassRowLevelFilters { get; }

    /// <summary>当前用户 Id。</summary>
    public long CurrentUserId { get; }

    /// <summary>部门范围模式下可访问的部门 Id 列表。</summary>
    public IReadOnlyList<long> AccessibleDepartmentIds { get; }
}
