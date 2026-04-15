using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.MultiTenancy.Providers;

/// <summary>
/// 根据 <see cref="TenantStorageRoutingOptions"/> 解析存储路由：映射中存在的租户使用独立连接串，否则与 <see cref="SharedPhysicalDatabaseTenantStorageRoutingProvider"/> 行为一致（共享物理库）。
/// </summary>
public sealed class ConfiguredTenantStorageRoutingProvider : ITenantStorageRoutingProvider
{
    private readonly TenantStorageRoutingOptions _options;

    /// <summary>
    /// 初始化 <see cref="ConfiguredTenantStorageRoutingProvider"/>。
    /// </summary>
    public ConfiguredTenantStorageRoutingProvider(IOptions<TenantStorageRoutingOptions> options)
    {
        _options = options?.Value ?? new TenantStorageRoutingOptions();
    }

    /// <inheritdoc />
    public ValueTask<TenantStorageRoutingContext> ResolveAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var normalizedTenantId = string.IsNullOrWhiteSpace(tenantId) ? string.Empty : tenantId.Trim();

        if (normalizedTenantId.Length > 0
            && _options.DedicatedDatabaseConnectionStrings.TryGetValue(normalizedTenantId, out var cs)
            && !string.IsNullOrWhiteSpace(cs))
        {
            var context = new TenantStorageRoutingContext(
                tenantId: normalizedTenantId,
                usesSharedPhysicalDatabase: false,
                dedicatedConnectionString: cs.Trim(),
                catalogOrShardKey: null);

            return ValueTask.FromResult(context);
        }

        var shared = new TenantStorageRoutingContext(
            tenantId: normalizedTenantId,
            usesSharedPhysicalDatabase: true,
            dedicatedConnectionString: null,
            catalogOrShardKey: null);

        return ValueTask.FromResult(shared);
    }
}
