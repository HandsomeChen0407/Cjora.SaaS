using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.DataPermission.Entities;

/// <summary>
/// 用户数据域授权关系（按租户隔离）。
/// </summary>
[SugarTable("sys_user_data_scope")]
[SugarIndex("idx_sys_user_data_scope_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_user_scope", nameof(TenantId), OrderByType.Asc, nameof(UserId), OrderByType.Asc, nameof(ScopeType), OrderByType.Asc, nameof(ScopeId), OrderByType.Asc)]
public sealed class SysUserDataScope : TenantEntityBase
{
    [SugarColumn(ColumnName = "user_id", IsNullable = false)]
    public long UserId { get; set; }

    /// <summary>
    /// 数据域类型：Department / Project / Customer / Custom...
    /// </summary>
    [SugarColumn(ColumnName = "scope_type", Length = 64, IsNullable = false)]
    public string ScopeType { get; set; } = "";

    /// <summary>
    /// 数据域 Id（部门Id / 项目Id 等）。
    /// </summary>
    [SugarColumn(ColumnName = "scope_id", IsNullable = false)]
    public long ScopeId { get; set; }
}

