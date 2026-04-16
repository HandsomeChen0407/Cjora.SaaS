using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Pm.Entities;

/// <summary>
/// 项目成员关联表：表达「用户参与项目」。UserId 为跨模块引用（Sys 用户），不建外键。
/// </summary>
[SugarTable("pm_project_member")]
[SugarIndex("idx_pm_project_member_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("uk_pm_project_member", nameof(TenantId), OrderByType.Asc, nameof(ProjectId), OrderByType.Asc, nameof(UserId), OrderByType.Asc, IsUnique = true)]
public sealed class PmProjectMember : TenantCreatorEntityBase, IProjectScopedEntity
{
    /// <summary>项目 Id。</summary>
    [SugarColumn(ColumnName = "project_id", IsNullable = false)]
    public long ProjectId { get; set; }

    /// <summary>用户 Id（跨模块引用 SysUser，不建外键）。</summary>
    [SugarColumn(ColumnName = "user_id", IsNullable = false)]
    public long UserId { get; set; }

    /// <summary>成员在项目中的角色（manager / member / viewer）。</summary>
    [SugarColumn(ColumnName = "role", Length = 32, IsNullable = false)]
    public string Role { get; set; } = "member";

    /// <summary>加入时间（UTC）。</summary>
    [SugarColumn(ColumnName = "joined_at_utc", IsNullable = false)]
    public DateTime JoinedAtUtc { get; set; }
}
