using SqlSugar;

namespace Cjora.SaaS.Sys.DataPermission.Entities;

/// <summary>
/// 用户数据域授权关系（按租户隔离）。
/// </summary>
[SugarTable("sys_user_data_scope")]
public sealed class SysUserDataScope
{
    [SugarColumn(IsPrimaryKey = true, IsIdentity = true)]
    public long Id { get; set; }

    [SugarColumn(ColumnName = "tenant_id", Length = 64, IsNullable = false)]
    public string TenantId { get; set; } = "";

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

