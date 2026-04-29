using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内角色；权限通过 <see cref="SysRolePermission"/> 中间表关联，数据范围通过 <see cref="SysRoleDataScope"/> 配置。
/// </summary>
[SugarTable("sys_role")]
[SugarIndex("idx_sys_role_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("uk_tenant_code", nameof(TenantId), OrderByType.Asc, nameof(Code), OrderByType.Asc, IsUnique = true)]
public sealed class SysRole : TenantCreatorEntityBase
{
    /// <summary>租户内角色编码（如 admin），租户内唯一。</summary>
    [SugarColumn(ColumnName = "code", Length = 64, IsNullable = false)]
    public string Code { get; set; } = "";

    /// <summary>显示名称。</summary>
    [SugarColumn(ColumnName = "name", Length = 128, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>内置角色标记，业务可禁止删除。</summary>
    [SugarColumn(ColumnName = "is_system", IsNullable = false)]
    public bool IsSystem { get; set; }

    /// <summary>是否启用。</summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>数据范围：all / tenant / dept / agent / self。</summary>
    [SugarColumn(ColumnName = "data_scope", Length = 32, IsNullable = false)]
    public string DataScope { get; set; } = "tenant";

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }
}
