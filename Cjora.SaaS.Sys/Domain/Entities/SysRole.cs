using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内角色；细粒度授权通过 <see cref="PermissionCodesJson"/> 存 JSON 字符串数组，与 <see cref="Permissions.SysPermissionCodes"/> 等常量对齐。
/// </summary>
/// <remarks>公共字段见 <see cref="SysLongIdTenantAuditedEntity"/>。</remarks>
[SugarTable("sys_role")]
public sealed class SysRole : SysLongIdTenantAuditedEntity
{
    /// <summary>
    /// 租户内角色编码（如 admin）。
    /// </summary>
    [SugarColumn(ColumnName = "code", Length = 64, IsNullable = false)]
    public string Code { get; set; } = "";

    /// <summary>
    /// 显示名称。
    /// </summary>
    [SugarColumn(ColumnName = "name", Length = 128, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>
    /// 权限码列表的 JSON 数组字符串，例如 <c>["sys.user.read","sys.role.manage"]</c>；空表示仅依赖角色编码在代码中的特殊处理。
    /// </summary>
    [SugarColumn(ColumnName = "permission_codes_json", Length = 8000, IsNullable = true)]
    public string? PermissionCodesJson { get; set; }

    /// <summary>
    /// 为 <see langword="true"/> 时表示内置角色，业务可禁止删除。
    /// </summary>
    [SugarColumn(ColumnName = "is_system", IsNullable = false)]
    public bool IsSystem { get; set; }

    /// <summary>
    /// 是否启用。
    /// </summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 备注。
    /// </summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }

    /// <summary>
    /// 菜单/按钮节点 Id 列表（JSON 数组字符串，前端权限树勾选用）。
    /// </summary>
    [SugarColumn(ColumnName = "menu_ids_json", Length = 8000, IsNullable = true)]
    public string? MenuIdsJson { get; set; }

    /// <summary>
    /// 数据范围：all / tenant / dept / self。
    /// </summary>
    [SugarColumn(ColumnName = "data_scope", Length = 32, IsNullable = false)]
    public string DataScope { get; set; } = "tenant";

    /// <summary>
    /// 当 <see cref="DataScope"/> 为 dept 时的部门 Id 列表（JSON 数组字符串）。
    /// </summary>
    [SugarColumn(ColumnName = "dept_ids_json", Length = 8000, IsNullable = true)]
    public string? DeptIdsJson { get; set; }

    /// <summary>
    /// 是否跳过数据权限（仅超级管理员角色使用）。
    /// </summary>
    [SugarColumn(ColumnName = "skip_data_perm", IsNullable = false)]
    public bool SkipDataPerm { get; set; }
}
