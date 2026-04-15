using SqlSugar;

namespace Cjora.SaaS.Sys.DataPermission.Entities;

/// <summary>
/// 部门闭包表（祖先-后代关系）。
/// </summary>
[SugarTable("sys_department_closure")]
public sealed class SysDepartmentClosure
{
    [SugarColumn(ColumnName = "ancestor_id", IsPrimaryKey = true)]
    public long AncestorId { get; set; }

    [SugarColumn(ColumnName = "descendant_id", IsPrimaryKey = true)]
    public long DescendantId { get; set; }
}

