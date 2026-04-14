using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内字典类型（如 USER_STATUS、DATA_SCOPE）。
/// </summary>
[SugarTable("sys_dict_type")]
public sealed class SysDictType : SysLongIdTenantAuditedEntity
{
    /// <summary>字典名称。</summary>
    [SugarColumn(ColumnName = "name", Length = 256, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>字典编码（建议租户内唯一）。</summary>
    [SugarColumn(ColumnName = "code", Length = 128, IsNullable = false)]
    public string Code { get; set; } = "";

    /// <summary>分类：system / business（用于前端过滤）。</summary>
    [SugarColumn(ColumnName = "category", Length = 32, IsNullable = false)]
    public string Category { get; set; } = "business";

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }

    /// <summary>是否启用。</summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>是否系统锁定（锁定后业务可禁止修改/删除）。</summary>
    [SugarColumn(ColumnName = "is_locked", IsNullable = false)]
    public bool IsLocked { get; set; }
}

