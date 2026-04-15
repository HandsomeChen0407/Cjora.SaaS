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
}
