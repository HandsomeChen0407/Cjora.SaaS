namespace Cjora.SaaS.Core.DataPermission.Enums;

/// <summary>
/// 行级数据权限范围：在「租户隔离」之上进一步限制用户可见的数据行（部门树、仅本人等）。
/// </summary>
/// <remarks>
/// <para>
/// <b>与多租户的关系</b>：<see cref="Cjora.SaaS.Core.Repository.Abstractions.ITenantScopedEntity"/> 负责物理/逻辑库内的租户边界；
/// 本枚举描述同一租户内「运营/管理员」可见的数据子集，二者通过 SqlSugar <c>QueryFilter</c> 叠加生效。
/// </para>
/// <para>
/// 典型映射来源：JWT/会话中的 <c>data_scope</c> 声明，或后台角色-数据范围配置表。
/// </para>
/// </remarks>
public enum DataScopeKind
{
    /// <summary>
    /// 全量（租户内不额外限制行；仍受全局 <c>TenantId</c> 过滤器约束，除非查询显式 <c>ClearFilter</c>）。
    /// </summary>
    All = 0,

    /// <summary>
    /// 本租户全部业务数据（与 <see cref="All"/> 在过滤器层面等价：不追加部门/本人条件）。
    /// </summary>
    Tenant = 1,

    /// <summary>
    /// 限定在可访问部门列表（含子部门时可在外部解析为展开后的 Id 集合）。
    /// </summary>
    Department = 2,

    /// <summary>
    /// 仅本人创建或归属的数据（依赖实体上的 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.ICreatorOwnedEntity"/>）。
    /// </summary>
    Self = 3,

    /// <summary>
    /// 项目域：仅可见当前用户参与的项目相关数据（依赖实体上的 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IProjectScopedEntity"/>，由 PM 等业务模块通过 EXISTS 实现）。
    /// </summary>
    Project = 4,

    /// <summary>
    /// 客户域：仅可见「创建人为本人」的客户及其子资源（依赖实体上的 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.ICustomerScopedEntity"/>，由 CRM 等业务模块通过 EXISTS 实现）。
    /// </summary>
    Customer = 5,

    /// <summary>
    /// 代理商域：仅可见当前用户被授权的代理商及其关联业务数据（依赖实体上的 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IAgentScopedEntity"/>；
    /// 可访问代理商 Id 列表由宿主 IAM 通过 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IDataScopeIdResolver"/> 解析，例如 Sys 模块的 <c>sys_user_data_scope</c>）。
    /// </summary>
    Agent = 6
}
