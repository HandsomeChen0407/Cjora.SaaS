using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内部门主数据（树形可选）。与 Core 中业务行上的 <see cref="Cjora.SaaS.Core.DataPermission.IDepartmentScopedEntity.DepartmentId"/> 使用同一套数值主键，
/// 便于登录发令牌时写入 <c>AccessibleDepartmentIds</c> 等声明，并与 SqlSugar 部门行级过滤器对齐。
/// </summary>
/// <remarks>
/// <para>公共字段见 <see cref="SysLongIdTenantAuditedEntity"/>。</para>
/// <para>
/// 本实体仅实现 <see cref="Cjora.SaaS.Core.Repository.ITenantScopedEntity"/>（通过基类），不实现 <see cref="Cjora.SaaS.Core.DataPermission.IDepartmentScopedEntity"/>：
/// 组织主数据通常按租户全员可见（或另做管理端权限），避免「按部门过滤部门表」导致无法维护整棵树。
/// </para>
/// </remarks>
[SugarTable("sys_department")]
public sealed class SysDepartment : SysLongIdTenantAuditedEntity
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
}
