using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 用户与角色的多对多关联，带租户隔离。
/// </summary>
[SugarTable("sys_user_role")]
[SugarIndex("uk_tenant_user_role", nameof(TenantId), OrderByType.Asc, nameof(UserId), OrderByType.Asc, nameof(RoleId), OrderByType.Asc, IsUnique = true)]
public sealed class SysUserRole : SysLongIdTenantAuditedEntity
{
    /// <summary>用户 Id。</summary>
    [SugarColumn(ColumnName = "user_id", IsNullable = false)]
    public long UserId { get; set; }

    /// <summary>角色 Id。</summary>
    [SugarColumn(ColumnName = "role_id", IsNullable = false)]
    public long RoleId { get; set; }
}
