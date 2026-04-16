using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Core.DataPermission.Models;

/// <summary>
/// 与 ORM 无关的数据权限授予结果。
/// </summary>
/// <remarks>
/// <para>由 <see cref="Abstractions.IDataPermissionProvider"/> 产出，消费方根据 <see cref="Scope"/> 自行构建查询条件。</para>
/// <para>各字段在不同 Scope 下的含义：</para>
/// <list type="table">
///   <listheader><term>Scope</term><description>有效字段</description></listheader>
///   <item><term>All / Tenant</term><description><see cref="IsFullAccess"/> = true，无需额外过滤</description></item>
///   <item><term>Department</term><description><see cref="AccessibleDepartmentIds"/> 为展开后的部门 Id 集合</description></item>
///   <item><term>Self</term><description><see cref="CurrentUserId"/> 为创建人过滤条件</description></item>
///   <item><term>Project</term><description><see cref="AccessibleProjectIds"/> 为可访问项目 Id 集合（由 PM 服务填充）</description></item>
///   <item><term>Customer</term><description><see cref="AccessibleCustomerIds"/> 为可访问客户 Id 集合（由 CRM 服务填充）</description></item>
/// </list>
/// </remarks>
public sealed class DataPermissionGrant
{
    /// <summary>当前数据范围。</summary>
    public DataScopeKind Scope { get; init; }

    /// <summary>是否全量访问（<see cref="DataScopeKind.All"/> 或 <see cref="DataScopeKind.Tenant"/> 或 bypass 场景）。</summary>
    public bool IsFullAccess { get; init; }

    /// <summary>当前用户 Id。</summary>
    public long CurrentUserId { get; init; }

    /// <summary>当前租户 Id。</summary>
    public string TenantId { get; init; } = string.Empty;

    /// <summary>Department 范围下可访问的部门 Id 集合。</summary>
    public IReadOnlyList<long> AccessibleDepartmentIds { get; init; } = Array.Empty<long>();

    /// <summary>Project 范围下可访问的项目 Id 集合（微服务场景由 PM 服务填充）。</summary>
    public IReadOnlyList<long> AccessibleProjectIds { get; init; } = Array.Empty<long>();

    /// <summary>Customer 范围下可访问的客户 Id 集合（微服务场景由 CRM 服务填充）。</summary>
    public IReadOnlyList<long> AccessibleCustomerIds { get; init; } = Array.Empty<long>();

    /// <summary>
    /// 从已有的 <see cref="DataPermissionResult"/> 和 <see cref="Abstractions.IDataPermissionContext"/> 构建基础 Grant。
    /// </summary>
    public static DataPermissionGrant FromContext(Abstractions.IDataPermissionContext context, string tenantId)
    {
        return new DataPermissionGrant
        {
            Scope = context.Scope,
            IsFullAccess = context.BypassRowLevelFilters
                           || context.Scope is DataScopeKind.All or DataScopeKind.Tenant,
            CurrentUserId = context.CurrentUserId,
            TenantId = tenantId,
            AccessibleDepartmentIds = context.AccessibleDepartmentIds
        };
    }
}
