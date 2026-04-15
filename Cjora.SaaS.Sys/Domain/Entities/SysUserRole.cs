using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 用户与角色的多对多关联，带租户隔离。
/// </summary>
/// <remarks>公共字段见 <see cref="SysLongIdTenantAuditedEntity"/>。</remarks>
[SugarTable("sys_user_role")]
public sealed class SysUserRole : SysLongIdTenantAuditedEntity
{
    /// <summary>
    /// 用户 Id，对应 <see cref="SysUser"/> 的 <see cref="SysLongIdTenantAuditedEntity.Id"/>。
    /// </summary>
    [SugarColumn(ColumnName = "user_id", IsNullable = false)]
    public long UserId { get; set; }

    /// <summary>
    /// 角色 Id，对应 <see cref="SysRole"/> 的 <see cref="SysLongIdTenantAuditedEntity.Id"/>。
    /// </summary>
    [SugarColumn(ColumnName = "role_id", IsNullable = false)]
    public long RoleId { get; set; }
}
