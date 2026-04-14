using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 字典项：隶属于 <see cref="SysDictType"/>。
/// </summary>
[SugarTable("sys_dict_item")]
public sealed class SysDictItem : SysLongIdTenantAuditedEntity
{
    /// <summary>所属字典类型 Id。</summary>
    [SugarColumn(ColumnName = "type_id", IsNullable = false)]
    public long TypeId { get; set; }

    /// <summary>显示标签。</summary>
    [SugarColumn(ColumnName = "label", Length = 256, IsNullable = false)]
    public string Label { get; set; } = "";

    /// <summary>存储值。</summary>
    [SugarColumn(ColumnName = "value", Length = 256, IsNullable = false)]
    public string Value { get; set; } = "";

    /// <summary>排序。</summary>
    [SugarColumn(ColumnName = "sort_order", IsNullable = false)]
    public int SortOrder { get; set; }

    /// <summary>是否启用。</summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }
}

