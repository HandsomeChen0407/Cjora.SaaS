using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Pm.Entities;

/// <summary>
/// 项目主数据。通过 <see cref="CustomerId"/> 关联 CRM 客户（仅 ID，不建外键）。
/// </summary>
[SugarTable("pm_project")]
[SugarIndex("idx_pm_project_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_pm_project_dept", nameof(TenantId), OrderByType.Asc, nameof(DepartmentId), OrderByType.Asc)]
[SugarIndex("idx_pm_project_customer", nameof(TenantId), OrderByType.Asc, nameof(CustomerId), OrderByType.Asc)]
public sealed class PmProject : TenantDepartmentEntityBase, IProjectScopedEntity
{
    /// <summary>
    /// 与主键 <c>id</c> 同义，用于 <see cref="IProjectScopedEntity"/>；不落库。
    /// </summary>
    [SugarColumn(IsIgnore = true)]
    public long ProjectId
    {
        get => Id;
        set => Id = value;
    }

    /// <summary>关联客户 Id（跨模块 ID 引用，不建外键）。</summary>
    [SugarColumn(ColumnName = "customer_id", IsNullable = true)]
    public long? CustomerId { get; set; }

    /// <summary>项目名称。</summary>
    [SugarColumn(ColumnName = "name", Length = 256, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>项目编码。</summary>
    [SugarColumn(ColumnName = "code", Length = 64, IsNullable = true)]
    public string? Code { get; set; }

    /// <summary>项目状态（draft / active / completed / closed）。</summary>
    [SugarColumn(ColumnName = "status", Length = 32, IsNullable = false)]
    public string Status { get; set; } = "draft";

    /// <summary>计划开始日期。</summary>
    [SugarColumn(ColumnName = "start_date", IsNullable = true)]
    public DateTime? StartDate { get; set; }

    /// <summary>计划结束日期。</summary>
    [SugarColumn(ColumnName = "end_date", IsNullable = true)]
    public DateTime? EndDate { get; set; }

    /// <summary>项目预算。</summary>
    [SugarColumn(ColumnName = "budget", DecimalDigits = 2, IsNullable = true)]
    public decimal? Budget { get; set; }

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }
}
