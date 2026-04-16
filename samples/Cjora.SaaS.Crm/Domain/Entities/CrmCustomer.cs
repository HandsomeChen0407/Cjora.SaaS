using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Crm.Entities;

/// <summary>
/// 客户主数据。
/// </summary>
[SugarTable("crm_customer")]
[SugarIndex("idx_crm_customer_tenant", nameof(TenantId), OrderByType.Asc)]
[SugarIndex("idx_crm_customer_dept", nameof(TenantId), OrderByType.Asc, nameof(DepartmentId), OrderByType.Asc)]
public sealed class CrmCustomer : TenantDepartmentEntityBase, ICustomerScopedEntity
{
    /// <summary>
    /// 与主键 <c>id</c> 同义，用于 <see cref="ICustomerScopedEntity"/>；不落库。
    /// </summary>
    [SugarColumn(IsIgnore = true)]
    public long CustomerId
    {
        get => Id;
        set => Id = value;
    }

    /// <summary>客户名称。</summary>
    [SugarColumn(ColumnName = "name", Length = 256, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>客户简称。</summary>
    [SugarColumn(ColumnName = "short_name", Length = 128, IsNullable = true)]
    public string? ShortName { get; set; }

    /// <summary>行业。</summary>
    [SugarColumn(ColumnName = "industry", Length = 128, IsNullable = true)]
    public string? Industry { get; set; }

    /// <summary>客户来源（如推荐、官网、展会）。</summary>
    [SugarColumn(ColumnName = "source", Length = 64, IsNullable = true)]
    public string? Source { get; set; }

    /// <summary>客户等级（如 A / B / C）。</summary>
    [SugarColumn(ColumnName = "level", Length = 32, IsNullable = true)]
    public string? Level { get; set; }

    /// <summary>联系电话。</summary>
    [SugarColumn(ColumnName = "phone", Length = 32, IsNullable = true)]
    public string? Phone { get; set; }

    /// <summary>邮箱。</summary>
    [SugarColumn(ColumnName = "email", Length = 256, IsNullable = true)]
    public string? Email { get; set; }

    /// <summary>地址。</summary>
    [SugarColumn(ColumnName = "address", Length = 512, IsNullable = true)]
    public string? Address { get; set; }

    /// <summary>备注。</summary>
    [SugarColumn(ColumnName = "remark", Length = 2000, IsNullable = true)]
    public string? Remark { get; set; }

    /// <summary>是否启用。</summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;
}
