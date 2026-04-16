using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Crm.Entities;

/// <summary>
/// 客户联系人。
/// </summary>
[SugarTable("crm_customer_contact")]
[SugarIndex("idx_crm_customer_contact_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_crm_customer_contact_cust", nameof(TenantId), OrderByType.Asc, nameof(CustomerId), OrderByType.Asc)]
public sealed class CrmCustomerContact : TenantDepartmentEntityBase, ICustomerScopedEntity
{
    /// <summary>所属客户 Id。</summary>
    [SugarColumn(ColumnName = "customer_id", IsNullable = false)]
    public long CustomerId { get; set; }

    /// <summary>联系人姓名。</summary>
    [SugarColumn(ColumnName = "name", Length = 128, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>职务。</summary>
    [SugarColumn(ColumnName = "title", Length = 128, IsNullable = true)]
    public string? Title { get; set; }

    /// <summary>联系电话。</summary>
    [SugarColumn(ColumnName = "phone", Length = 32, IsNullable = true)]
    public string? Phone { get; set; }

    /// <summary>邮箱。</summary>
    [SugarColumn(ColumnName = "email", Length = 256, IsNullable = true)]
    public string? Email { get; set; }

    /// <summary>是否为主要联系人。</summary>
    [SugarColumn(ColumnName = "is_primary", IsNullable = false)]
    public bool IsPrimary { get; set; }

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }
}
