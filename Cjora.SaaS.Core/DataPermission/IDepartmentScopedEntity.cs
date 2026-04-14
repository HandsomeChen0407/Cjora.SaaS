using Cjora.SaaS.Core.Repository;

namespace Cjora.SaaS.Core.DataPermission;

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
