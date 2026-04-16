using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内权限节点：菜单（路由）与按钮（权限码）统一建模，用于构建权限树。
/// </summary>
[SugarTable("sys_permission")]
[SugarIndex("idx_sys_permission_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("uk_tenant_permcode", nameof(TenantId), OrderByType.Asc, nameof(PermCode), OrderByType.Asc, IsUnique = true)]
public sealed class SysPermission : TenantCreatorEntityBase
{
    /// <summary>父节点 Id；根节点为 <see langword="null"/>。</summary>
    [SugarColumn(ColumnName = "parent_id", IsNullable = true)]
    public long? ParentId { get; set; }

    /// <summary>显示名称。</summary>
    [SugarColumn(ColumnName = "label", Length = 256, IsNullable = false)]
    public string Label { get; set; } = "";

    /// <summary>节点类型：menu / button。</summary>
    [SugarColumn(ColumnName = "node_type", Length = 16, IsNullable = false)]
    public string NodeType { get; set; } = "menu";

    /// <summary>菜单路由路径（仅 menu 节点使用）。</summary>
    [SugarColumn(ColumnName = "path", Length = 512, IsNullable = true)]
    public string? Path { get; set; }

    /// <summary>权限码（仅 button 节点使用）。</summary>
    [SugarColumn(ColumnName = "perm_code", Length = 256, IsNullable = true)]
    public string? PermCode { get; set; }

    /// <summary>图标（前端可选使用）。</summary>
    [SugarColumn(ColumnName = "icon", Length = 128, IsNullable = true)]
    public string? Icon { get; set; }

    /// <summary>同级排序，越小越靠前。</summary>
    [SugarColumn(ColumnName = "sort_order", IsNullable = false)]
    public int SortOrder { get; set; }

    /// <summary>是否在菜单中可见。</summary>
    [SugarColumn(ColumnName = "is_visible", IsNullable = false)]
    public bool IsVisible { get; set; } = true;

    /// <summary>是否启用。</summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;
}
