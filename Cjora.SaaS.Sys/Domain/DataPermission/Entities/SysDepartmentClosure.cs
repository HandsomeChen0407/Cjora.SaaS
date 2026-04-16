using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.DataPermission.Entities;

/// <summary>
/// 部门闭包表（祖先-后代关系）。
/// </summary>
[SugarTable("sys_department_closure")]
[SugarIndex("idx_sys_department_closure_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_closure_ad", nameof(TenantId), OrderByType.Asc, nameof(AncestorId), OrderByType.Asc, nameof(DescendantId), OrderByType.Asc)]
[SugarIndex("idx_closure_d", nameof(DescendantId), OrderByType.Asc)]
public sealed class SysDepartmentClosure : TenantEntityBase
{
    [SugarColumn(ColumnName = "ancestor_id", IsNullable = false)]
    public long AncestorId { get; set; }

    [SugarColumn(ColumnName = "descendant_id", IsNullable = false)]
    public long DescendantId { get; set; }
}

