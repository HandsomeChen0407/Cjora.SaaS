using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内用户（IAM 档案）；登录主体若在统一认证侧，可通过 <see cref="ExternalSubjectId"/> 对齐。
/// </summary>
/// <remarks>公共字段见 <see cref="SysLongIdTenantAuditedEntity"/>。</remarks>
[SugarTable("sys_user")]
public sealed class SysUser : SysLongIdTenantAuditedEntity
{
    /// <summary>
    /// 租户内登录名（唯一性由库约束或业务保证）。
    /// </summary>
    [SugarColumn(ColumnName = "login_name", Length = 128, IsNullable = false)]
    public string LoginName { get; set; } = "";

    /// <summary>
    /// 显示名称。
    /// </summary>
    [SugarColumn(ColumnName = "display_name", Length = 256, IsNullable = false)]
    public string DisplayName { get; set; } = "";

    /// <summary>
    /// 是否启用。
    /// </summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 所属部门主键，与 <see cref="SysDepartment"/> 的 <see cref="SysLongIdTenantAuditedEntity.Id"/> 及 Core 中 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IDepartmentScopedEntity"/> 的部门维度一致；
    /// 企业级数据权限引擎启用后，不再写入 JWT 声明；应通过 <c>sys_user_data_scope</c> + 闭包表在查询时实时判定访问范围。
    /// </summary>
    [SugarColumn(ColumnName = "department_id", IsNullable = true)]
    public long? DepartmentId { get; set; }

    /// <summary>
    /// 可选冗余展示名（无外键、不参与 Core 过滤器）；仅在未维护 <see cref="DepartmentId"/> 或需覆盖显示时使用。
    /// </summary>
    [SugarColumn(ColumnName = "department_name", Length = 256, IsNullable = true)]
    public string? DepartmentName { get; set; }

    /// <summary>
    /// 外部身份主体 Id（如 OIDC sub），可空。
    /// </summary>
    [SugarColumn(ColumnName = "external_subject_id", Length = 128, IsNullable = true)]
    public string? ExternalSubjectId { get; set; }

    /// <summary>
    /// 邮箱（可选）。
    /// </summary>
    [SugarColumn(ColumnName = "email", Length = 256, IsNullable = true)]
    public string? Email { get; set; }

    /// <summary>
    /// 手机号（可选）。
    /// </summary>
    [SugarColumn(ColumnName = "phone", Length = 32, IsNullable = true)]
    public string? Phone { get; set; }
}
