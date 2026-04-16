using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 角色与权限节点的多对多关联（标准 RBAC 中间表），取代原 <c>SysRole.PermissionCodesJson</c> / <c>MenuIdsJson</c>。
/// </summary>
[SugarTable("sys_role_permission")]
[SugarIndex("idx_sys_role_permission_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("uk_tenant_role_perm", nameof(TenantId), OrderByType.Asc, nameof(RoleId), OrderByType.Asc, nameof(PermissionId), OrderByType.Asc, IsUnique = true)]
public sealed class SysRolePermission : TenantCreatorEntityBase
{
    /// <summary>角色 Id。</summary>
    [SugarColumn(ColumnName = "role_id", IsNullable = false)]
    public long RoleId { get; set; }

    /// <summary>权限节点 Id（菜单或按钮均可）。</summary>
    [SugarColumn(ColumnName = "permission_id", IsNullable = false)]
    public long PermissionId { get; set; }
}
