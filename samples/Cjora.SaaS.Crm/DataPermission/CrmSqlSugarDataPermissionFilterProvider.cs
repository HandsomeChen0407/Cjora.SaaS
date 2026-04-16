using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Crm.Entities;
using SqlSugar;

namespace Cjora.SaaS.Crm.DataPermission;

/// <summary>
/// CRM 客户域：在 <see cref="DataScopeKind.Customer"/> 下对 <see cref="ICustomerScopedEntity"/> 追加 EXISTS（客户创建人为当前用户）。
/// </summary>
public sealed class CrmSqlSugarDataPermissionFilterProvider : ISqlSugarDataPermissionFilterProvider
{
    private static readonly DataScopeKind[] CustomerOnly = { DataScopeKind.Customer };

    /// <inheritdoc />
    public IReadOnlyList<DataScopeKind> HandledDataScopes => CustomerOnly;

    /// <inheritdoc />
    public void Apply(ISqlSugarClient client, IDataPermissionContext context)
    {
        client.QueryFilter.AddTableFilter<ICustomerScopedEntity>(
            entity =>
                context.IsDisabled
                || context.BypassRowLevelFilters
                || (
                    context.Scope == DataScopeKind.Customer
                    && context.CurrentUserId > 0
                    && SqlFunc.Subqueryable<CrmCustomer>()
                        .Where(c =>
                            c.TenantId == entity.TenantId
                            && c.Id == entity.CustomerId
                            && c.CreatorUserId == context.CurrentUserId)
                        .Any()
                )
                || context.Scope != DataScopeKind.Customer,
            QueryFilterProvider.FilterJoinPosition.Where);
    }
}
