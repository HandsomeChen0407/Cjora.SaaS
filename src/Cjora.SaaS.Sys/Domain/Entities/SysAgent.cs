using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内代理商主数据；与 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IAgentScopedEntity"/> 的 <c>AgentId</c> 对齐。
/// </summary>
[SugarTable("sys_agent")]
[SugarIndex("idx_sys_agent_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("uk_sys_agent_tenant_code", nameof(TenantId), OrderByType.Asc, nameof(Code), OrderByType.Asc, IsUnique = true)]
public sealed class SysAgent : TenantCreatorEntityBase
{
    [SugarColumn(ColumnName = "code", Length = 64, IsNullable = false)]
    public string Code { get; set; } = "";

    [SugarColumn(ColumnName = "name", Length = 128, IsNullable = false)]
    public string Name { get; set; } = "";

    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;
}
