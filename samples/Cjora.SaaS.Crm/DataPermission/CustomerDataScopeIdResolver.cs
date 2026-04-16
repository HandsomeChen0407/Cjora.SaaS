using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Crm.Entities;
using SqlSugar;

namespace Cjora.SaaS.Crm.DataPermission;

/// <summary>
/// 解析当前用户在 <see cref="DataScopeKind.Customer"/> 下可访问的客户 Id 集合（创建人为当前用户的客户）。
/// </summary>
public sealed class CustomerDataScopeIdResolver : IDataScopeIdResolver
{
    private readonly ISqlSugarClient _db;

    public CustomerDataScopeIdResolver(ISqlSugarClient db) => _db = db;

    /// <inheritdoc />
    public DataScopeKind Scope => DataScopeKind.Customer;

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ResolveAccessibleIdsAsync(
        long userId, string tenantId, CancellationToken cancellationToken = default)
    {
        var ids = await _db.Queryable<CrmCustomer>()
            .Where(c => c.TenantId == tenantId && c.CreatorUserId == userId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return ids;
    }
}
