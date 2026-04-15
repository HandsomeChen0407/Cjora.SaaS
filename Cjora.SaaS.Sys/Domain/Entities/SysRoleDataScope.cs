using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 角色级数据范围授权（当 <c>SysRole.DataScope == "dept"</c> 时的部门列表），取代原 <c>SysRole.DeptIdsJson</c>。
/// 用户分配角色时应自动同步到 <c>sys_user_data_scope</c>，供 Core EXISTS 过滤器消费。
/// </summary>
[SugarTable("sys_role_data_scope")]
[SugarIndex("uk_tenant_role_scope", nameof(TenantId), OrderByType.Asc, nameof(RoleId), OrderByType.Asc, nameof(ScopeType), OrderByType.Asc, nameof(ScopeId), OrderByType.Asc, IsUnique = true)]
public sealed class SysRoleDataScope : SysLongIdTenantAuditedEntity
{
    /// <summary>角色 Id。</summary>
    [SugarColumn(ColumnName = "role_id", IsNullable = false)]
    public long RoleId { get; set; }

    /// <summary>数据域类型（与 <c>SysUserDataScope.ScopeType</c> 对齐：Department / Project / Customer 等）。</summary>
    [SugarColumn(ColumnName = "scope_type", Length = 64, IsNullable = false)]
    public string ScopeType { get; set; } = "";

    /// <summary>数据域 Id（部门 Id / 项目 Id 等）。</summary>
    [SugarColumn(ColumnName = "scope_id", IsNullable = false)]
    public long ScopeId { get; set; }
}
