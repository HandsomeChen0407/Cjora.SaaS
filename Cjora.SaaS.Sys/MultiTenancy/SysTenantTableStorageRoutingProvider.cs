using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Sys.Repositories;

namespace Cjora.SaaS.Sys.MultiTenancy;

/// <summary>
/// 根据平台主库 <c>sys_tenant</c> 中的 <see cref="Entities.SysTenant.DedicatedDatabaseConnectionString"/> 解析独立物理库；
/// 为空或未找到租户行时回退为共享 <see cref="Cjora.SaaS.Core.SqlSugar.Models.SqlSugarSaaSOptions.MasterConnectionString"/>。
/// </summary>
public sealed class SysTenantTableStorageRoutingProvider : ITenantStorageRoutingProvider
{
    private readonly ISysTenantRepository _tenants;

    /// <summary>
    /// 初始化 <see cref="SysTenantTableStorageRoutingProvider"/>。
    /// </summary>
    public SysTenantTableStorageRoutingProvider(ISysTenantRepository tenants)
    {
        _tenants = tenants;
    }

    /// <inheritdoc />
    public async ValueTask<TenantStorageRoutingContext> ResolveAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        var normalizedTenantId = string.IsNullOrWhiteSpace(tenantId) ? string.Empty : tenantId.Trim();

        if (normalizedTenantId.Length == 0)
        {
            return new TenantStorageRoutingContext(
                tenantId: string.Empty,
                usesSharedPhysicalDatabase: true,
                dedicatedConnectionString: null,
                catalogOrShardKey: null);
        }

        var row = await _tenants.GetByIdAsync(normalizedTenantId, cancellationToken).ConfigureAwait(false);
        if (row is null)
        {
            return new TenantStorageRoutingContext(
                tenantId: normalizedTenantId,
                usesSharedPhysicalDatabase: true,
                dedicatedConnectionString: null,
                catalogOrShardKey: null);
        }

        var cs = row.DedicatedDatabaseConnectionString;
        if (!string.IsNullOrWhiteSpace(cs))
        {
            return new TenantStorageRoutingContext(
                tenantId: normalizedTenantId,
                usesSharedPhysicalDatabase: false,
                dedicatedConnectionString: cs.Trim(),
                catalogOrShardKey: null);
        }

        return new TenantStorageRoutingContext(
            tenantId: normalizedTenantId,
            usesSharedPhysicalDatabase: true,
            dedicatedConnectionString: null,
            catalogOrShardKey: null);
    }
}
