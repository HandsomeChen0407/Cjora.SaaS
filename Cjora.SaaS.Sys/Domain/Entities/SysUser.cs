using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户内用户（IAM 档案）；登录主体若在统一认证侧，可通过 <see cref="ExternalSubjectId"/> 对齐。
/// </summary>
[SugarTable("sys_user")]
[SugarIndex("uk_tenant_login", nameof(TenantId), OrderByType.Asc, nameof(LoginName), OrderByType.Asc, IsUnique = true)]
public sealed class SysUser : SysLongIdTenantAuditedEntity
{
    /// <summary>租户内登录名，租户内唯一。</summary>
    [SugarColumn(ColumnName = "login_name", Length = 128, IsNullable = false)]
    public string LoginName { get; set; } = "";

    /// <summary>显示名称。</summary>
    [SugarColumn(ColumnName = "display_name", Length = 256, IsNullable = false)]
    public string DisplayName { get; set; } = "";

    /// <summary>密码哈希（BCrypt / PBKDF2）。</summary>
    [SugarColumn(ColumnName = "password_hash", Length = 256, IsNullable = true)]
    public string? PasswordHash { get; set; }

    /// <summary>是否启用。</summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>所属部门主键。</summary>
    [SugarColumn(ColumnName = "department_id", IsNullable = true)]
    public long? DepartmentId { get; set; }

    /// <summary>外部身份主体 Id（如 OIDC sub），可空。</summary>
    [SugarColumn(ColumnName = "external_subject_id", Length = 128, IsNullable = true)]
    public string? ExternalSubjectId { get; set; }

    /// <summary>邮箱。</summary>
    [SugarColumn(ColumnName = "email", Length = 256, IsNullable = true)]
    public string? Email { get; set; }

    /// <summary>手机号。</summary>
    [SugarColumn(ColumnName = "phone", Length = 32, IsNullable = true)]
    public string? Phone { get; set; }
}
