using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;

namespace Cjora.SaaS.Core.MultiTenancy.Providers;

/// <summary>
/// 默认的 <see cref="ITenantStorageRoutingProvider"/>：所有租户共享同一物理库，仅用逻辑租户标识区分。
/// </summary>
/// <remarks>
/// <see cref="TenantStorageRoutingContext.UsesSharedPhysicalDatabase"/> 恒为 <see langword="true"/>，不提供独立连接串。
/// 一租户一库场景请替换为自定义提供器并完成目录查询或配置映射。
/// </remarks>
public sealed class SharedPhysicalDatabaseTenantStorageRoutingProvider : ITenantStorageRoutingProvider
{
    /// <inheritdoc />
    public ValueTask<TenantStorageRoutingContext> ResolveAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var normalizedTenantId = string.IsNullOrWhiteSpace(tenantId) ? string.Empty : tenantId.Trim();
        var context = new TenantStorageRoutingContext(
            tenantId: normalizedTenantId,
            usesSharedPhysicalDatabase: true,
            dedicatedConnectionString: null,
            catalogOrShardKey: null);

        return ValueTask.FromResult(context);
    }
}

