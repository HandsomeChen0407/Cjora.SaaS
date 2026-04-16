using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内部门主数据（树形可选）。与 Core 中业务行上的 <see cref="Cjora.SaaS.Core.DataPermission.IDepartmentScopedEntity.DepartmentId"/> 使用同一套数值主键，
/// 企业级数据权限引擎启用后，部门范围不再通过 JWT 携带列表，而由 <c>sys_user_data_scope</c> + 闭包表在查询时实时判定。
/// </summary>
/// <remarks>
/// <para>公共字段见 <see cref="TenantCreatorEntityBase"/>。</para>
/// <para>
/// 本实体仅实现 <see cref="Cjora.SaaS.Core.Repository.Abstractions.ITenantScopedEntity"/>（通过基类），不实现 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IDepartmentScopedEntity"/>：
/// 组织主数据通常按租户全员可见（或另做管理端权限），避免「按部门过滤部门表」导致无法维护整棵树。
/// </para>
/// </remarks>
[SugarTable("sys_department")]
[SugarIndex("idx_sys_department_tenant", nameof(TenantId), OrderByType.Asc)]
public sealed class SysDepartment : TenantCreatorEntityBase
{
    /// <summary>
    /// 父部门 Id；根节点为 <see langword="null"/>。
    /// </summary>
    [SugarColumn(ColumnName = "parent_id", IsNullable = true)]
    public long? ParentId { get; set; }

    /// <summary>
    /// 部门名称。
    /// </summary>
    [SugarColumn(ColumnName = "name", Length = 256, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>
    /// 租户内可选编码（如 HR、FIN），便于导入与对接。
    /// </summary>
    [SugarColumn(ColumnName = "code", Length = 64, IsNullable = true)]
    public string? Code { get; set; }

    /// <summary>
    /// 同级排序，越小越靠前。
    /// </summary>
    [SugarColumn(ColumnName = "sort_order", IsNullable = false)]
    public int SortOrder { get; set; }

    /// <summary>
    /// 负责人（可选）。
    /// </summary>
    [SugarColumn(ColumnName = "leader", Length = 128, IsNullable = true)]
    public string? Leader { get; set; }

    /// <summary>
    /// 联系电话（可选）。
    /// </summary>
    [SugarColumn(ColumnName = "phone", Length = 32, IsNullable = true)]
    public string? Phone { get; set; }

    /// <summary>
    /// 是否启用。
    /// </summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;
}
