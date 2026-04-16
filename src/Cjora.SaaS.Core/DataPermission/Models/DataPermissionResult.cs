using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Core.DataPermission.Models;

/// <summary>
/// 一次解析得到的数据权限快照，由 <see cref="Abstractions.IDataPermissionResolver"/> 产出、供 <see cref="Abstractions.IDataPermissionContext"/> 作为只读视图暴露。
/// </summary>
/// <remarks>
/// <para>
/// 将「解析策略」与「运行时上下文接口」分离的目的：宿主可替换 Resolver（例如从数据库/缓存加载 RBAC 结果），
/// 而业务代码仅依赖稳定的 <see cref="Abstractions.IDataPermissionContext"/>，避免大面积改动。
/// </para>
/// <para>
/// 本类型为不可变值对象；同一 Scoped 请求内 <see cref="Abstractions.IDataPermissionResolver.ResolveAsync"/> 应返回语义一致的结果。
/// </para>
/// </remarks>
public sealed class DataPermissionResult
{
    /// <summary>
    /// 初始化 <see cref="DataPermissionResult"/>。
    /// </summary>
    public DataPermissionResult(
        DataScopeKind scope,
        bool bypassRowLevelFilters,
        long currentUserId,
        IReadOnlyList<long> accessibleDepartmentIds,
        IReadOnlyList<long> accessibleProjectIds,
        IReadOnlyList<long> accessibleCustomerIds)
    {
        Scope = scope;
        BypassRowLevelFilters = bypassRowLevelFilters;
        CurrentUserId = currentUserId;
        AccessibleDepartmentIds = accessibleDepartmentIds;
        AccessibleProjectIds = accessibleProjectIds;
        AccessibleCustomerIds = accessibleCustomerIds;
    }

    /// <summary>数据范围（与 <c>IDataPermissionContext.Scope</c> 语义一致）。</summary>
    public DataScopeKind Scope { get; }

    /// <summary>是否跳过行级过滤器。</summary>
    public bool BypassRowLevelFilters { get; }

    /// <summary>当前用户 Id。</summary>
    public long CurrentUserId { get; }

    /// <summary>Department 范围下可访问的部门 Id 列表（已展开子部门）。</summary>
    public IReadOnlyList<long> AccessibleDepartmentIds { get; }

    /// <summary>Project 范围下可访问的项目 Id 列表。</summary>
    public IReadOnlyList<long> AccessibleProjectIds { get; }

    /// <summary>Customer 范围下可访问的客户 Id 列表。</summary>
    public IReadOnlyList<long> AccessibleCustomerIds { get; }
}
