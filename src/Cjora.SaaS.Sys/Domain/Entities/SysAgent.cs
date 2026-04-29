using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内代理商主数据（树形，<see cref="ParentId"/> 为空表示根节点）；与
/// <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IAgentScopedEntity"/> 的 <c>AgentId</c> 对齐。
/// </summary>
/// <remarks>
/// 角色数据范围中配置的代理商 Id 视为「根」；数据权限解析器会按父子关系展开该节点及其全部后代。
/// </remarks>
[SugarTable("sys_agent")]
[SugarIndex("idx_sys_agent_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_sys_agent_parent", nameof(TenantId), OrderByType.Asc, nameof(ParentId), OrderByType.Asc)]
[SugarIndex("uk_sys_agent_tenant_code", nameof(TenantId), OrderByType.Asc, nameof(Code), OrderByType.Asc, IsUnique = true)]
public sealed class SysAgent : TenantCreatorEntityBase
{
    /// <summary>父代理商 Id；根节点为 <see langword="null"/>。</summary>
    [SugarColumn(ColumnName = "parent_id", IsNullable = true)]
    public long? ParentId { get; set; }

    [SugarColumn(ColumnName = "code", Length = 64, IsNullable = false)]
    public string Code { get; set; } = "";

    [SugarColumn(ColumnName = "name", Length = 128, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>同级排序，越小越靠前。</summary>
    [SugarColumn(ColumnName = "sort_order", IsNullable = false)]
    public int SortOrder { get; set; }

    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;
}
