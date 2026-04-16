using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Crm.Entities;

/// <summary>
/// 客户跟进记录。
/// </summary>
[SugarTable("crm_customer_follow")]
[SugarIndex("idx_crm_customer_follow_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_crm_customer_follow_cust", nameof(TenantId), OrderByType.Asc, nameof(CustomerId), OrderByType.Asc)]
public sealed class CrmCustomerFollow : TenantDepartmentEntityBase, ICustomerScopedEntity
{
    /// <summary>所属客户 Id。</summary>
    [SugarColumn(ColumnName = "customer_id", IsNullable = false)]
    public long CustomerId { get; set; }

    /// <summary>跟进方式（call / visit / email / wechat / other）。</summary>
    [SugarColumn(ColumnName = "follow_type", Length = 32, IsNullable = false)]
    public string FollowType { get; set; } = "";

    /// <summary>跟进内容。</summary>
    [SugarColumn(ColumnName = "content", Length = 4000, IsNullable = false)]
    public string Content { get; set; } = "";

    /// <summary>跟进时间（UTC）。</summary>
    [SugarColumn(ColumnName = "follow_at_utc", IsNullable = false)]
    public DateTime FollowAtUtc { get; set; }

    /// <summary>计划下次跟进时间（UTC）。</summary>
    [SugarColumn(ColumnName = "next_follow_at_utc", IsNullable = true)]
    public DateTime? NextFollowAtUtc { get; set; }
}
