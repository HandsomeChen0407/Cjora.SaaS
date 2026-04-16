using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 当前作用域内的数据权限上下文：由 <see cref="IDataPermissionResolver"/> 解析而来，供服务层通过
/// <c>.WithDataPermission()</c> 显式消费。
/// </summary>
/// <remarks>
/// 注册为 Scoped；非 HTTP 场景可注册自定义 <see cref="IDataPermissionContext"/> 实现。
/// </remarks>
public interface IDataPermissionContext
{
    /// <summary>
    /// 为 <see langword="true"/> 时跳过行级数据权限过滤（租户过滤器仍生效）。
    /// </summary>
    bool IsDisabled { get; }

    /// <summary>
    /// 当前用户的数据范围类型。
    /// </summary>
    DataScopeKind Scope { get; }

    /// <summary>
    /// 当为 <see langword="true"/> 时，不追加行级过滤条件（平台管理员、跨部门运维等场景）。
    /// </summary>
    /// <remarks>
    /// 注意：默认仍保留租户级 <see cref="Cjora.SaaS.Core.Repository.Abstractions.ITenantScopedEntity"/> 全局过滤；
    /// 若需跨租户查询，请在单次查询上使用 <see cref="Cjora.SaaS.Core.SqlSugar.Extensions.SqlSugarTenantQueryableExtensions.ClearTenantFilters{T}"/>。
    /// </remarks>
    bool BypassRowLevelFilters { get; }

    /// <summary>
    /// 当前用户 Id；在 <see cref="DataScopeKind.Self"/> 下用于拼接创建人条件。
    /// </summary>
    long CurrentUserId { get; }

    /// <summary>
    /// 在 <see cref="DataScopeKind.Department"/> 下允许访问的部门 Id 集合（已由上层展开子部门）。
    /// </summary>
    IReadOnlyList<long> AccessibleDepartmentIds { get; }

    /// <summary>
    /// 在 <see cref="DataScopeKind.Project"/> 下允许访问的项目 Id 集合。
    /// </summary>
    IReadOnlyList<long> AccessibleProjectIds { get; }

    /// <summary>
    /// 在 <see cref="DataScopeKind.Customer"/> 下允许访问的客户 Id 集合。
    /// </summary>
    IReadOnlyList<long> AccessibleCustomerIds { get; }
}
