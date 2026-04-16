using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Pm.Entities;

/// <summary>
/// 项目合同。CustomerId 为跨模块引用（CRM 客户），不建外键。
/// </summary>
[SugarTable("pm_project_contract")]
[SugarIndex("idx_pm_project_contract_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_pm_project_contract_dept", nameof(TenantId), OrderByType.Asc, nameof(DepartmentId), OrderByType.Asc)]
[SugarIndex("idx_pm_project_contract_proj", nameof(TenantId), OrderByType.Asc, nameof(ProjectId), OrderByType.Asc)]
public sealed class PmProjectContract : TenantDepartmentEntityBase, IProjectScopedEntity
{
    /// <summary>项目 Id。</summary>
    [SugarColumn(ColumnName = "project_id", IsNullable = false)]
    public long ProjectId { get; set; }

    /// <summary>关联客户 Id（跨模块引用，不建外键）。</summary>
    [SugarColumn(ColumnName = "customer_id", IsNullable = true)]
    public long? CustomerId { get; set; }

    /// <summary>合同编号。</summary>
    [SugarColumn(ColumnName = "contract_no", Length = 64, IsNullable = false)]
    public string ContractNo { get; set; } = "";

    /// <summary>合同标题。</summary>
    [SugarColumn(ColumnName = "title", Length = 256, IsNullable = false)]
    public string Title { get; set; } = "";

    /// <summary>合同金额。</summary>
    [SugarColumn(ColumnName = "amount", DecimalDigits = 2, IsNullable = false)]
    public decimal Amount { get; set; }

    /// <summary>签约时间（UTC）。</summary>
    [SugarColumn(ColumnName = "signed_at_utc", IsNullable = true)]
    public DateTime? SignedAtUtc { get; set; }

    /// <summary>生效日期。</summary>
    [SugarColumn(ColumnName = "effective_date", IsNullable = true)]
    public DateTime? EffectiveDate { get; set; }

    /// <summary>到期日期。</summary>
    [SugarColumn(ColumnName = "expiry_date", IsNullable = true)]
    public DateTime? ExpiryDate { get; set; }

    /// <summary>合同状态（draft / signed / executing / completed / terminated）。</summary>
    [SugarColumn(ColumnName = "status", Length = 32, IsNullable = false)]
    public string Status { get; set; } = "draft";

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }
}
