using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.Repository.Abstractions;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 标记实体包含「部门」维度，可在 <see cref="DataScopeKind.Department"/> 下由全局过滤器追加 <c>DepartmentId IN (...)</c> 条件。
/// </summary>
/// <remarks>
/// 实现类应同时实现 <see cref="ITenantScopedEntity"/>，以保证先租户后部门的 AND 叠加顺序符合预期。
/// </remarks>
public interface IDepartmentScopedEntity : ITenantScopedEntity
{
    /// <summary>
    /// 行所属部门主键，与组织架构中部门表一致。
    /// </summary>
    long DepartmentId { get; set; }
}

/// <summary>
/// 标记实体包含「项目」维度，可由业务侧的数据权限提供者追加项目域过滤（建议 EXISTS/JOIN，不使用 IN）。
/// </summary>
public interface IProjectScopedEntity : ITenantScopedEntity
{
    /// <summary>行所属项目主键。</summary>
    long ProjectId { get; set; }
}

/// <summary>
/// 标记实体包含「客户」维度，可由业务侧的数据权限提供者追加客户域过滤（建议 EXISTS/JOIN，不使用 IN）。
/// </summary>
public interface ICustomerScopedEntity : ITenantScopedEntity
{
    /// <summary>行所属客户主键。</summary>
    long CustomerId { get; set; }
}

/// <summary>
/// 标记实体包含「代理商」维度，可在 <see cref="DataScopeKind.Agent"/> 下由服务层 <c>.WithDataPermission()</c> 追加 <c>AgentId IN (...)</c> 条件。
/// </summary>
public interface IAgentScopedEntity : ITenantScopedEntity
{
    /// <summary>行所属代理商主键，与 IAM 中代理商主数据表一致。</summary>
    long AgentId { get; set; }
}
