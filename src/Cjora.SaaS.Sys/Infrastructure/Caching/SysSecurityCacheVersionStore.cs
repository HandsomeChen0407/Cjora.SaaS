using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;

namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <summary>
/// 缓存版本号存储：通过“版本 key”使缓存键失效（适用于多实例/分布式）。
/// </summary>
public sealed class SysSecurityCacheVersionStore
{
    private const string Module = "sys";
    private readonly ICachingService _cache;
    private readonly ITenantProvider _tenantProvider;

    public SysSecurityCacheVersionStore(ICachingService cache, ITenantProvider tenantProvider)
    {
        _cache = cache;
        _tenantProvider = tenantProvider;
    }

    public Task<string> GetPermissionVersionAsync(CancellationToken cancellationToken = default)
        => GetOrInitAsync(SaaSCacheKeys.Version(Module, "perm", _tenantProvider.GetTenantId()), cancellationToken);

    public Task<string> GetDataPermissionVersionAsync(CancellationToken cancellationToken = default)
        => GetOrInitAsync(SaaSCacheKeys.Version(Module, "scope", _tenantProvider.GetTenantId()), cancellationToken);

    public Task<string> GetDepartmentVersionAsync(CancellationToken cancellationToken = default)
        => GetOrInitAsync(SaaSCacheKeys.Version(Module, "dept", _tenantProvider.GetTenantId()), cancellationToken);

    public Task BumpPermissionVersionAsync(CancellationToken cancellationToken = default)
        => BumpAsync(SaaSCacheKeys.Version(Module, "perm", _tenantProvider.GetTenantId()), cancellationToken);

    public Task BumpDataPermissionVersionAsync(CancellationToken cancellationToken = default)
        => BumpAsync(SaaSCacheKeys.Version(Module, "scope", _tenantProvider.GetTenantId()), cancellationToken);

    public Task BumpDepartmentVersionAsync(CancellationToken cancellationToken = default)
        => BumpAsync(SaaSCacheKeys.Version(Module, "dept", _tenantProvider.GetTenantId()), cancellationToken);

    private async Task<string> GetOrInitAsync(string key, CancellationToken cancellationToken)
    {
        var v = await _cache.GetAsync<string>(key).ConfigureAwait(false);
        if (!string.IsNullOrWhiteSpace(v))
        {
            return v!;
        }

        var init = "0";
        // 版本号不应太短过期，给一个较长 TTL；若实现选择不设置 TTL 也可接受。
        await _cache.SetAsync(key, init, TimeSpan.FromDays(30)).ConfigureAwait(false);
        return init;
    }

    private Task BumpAsync(string key, CancellationToken cancellationToken)
    {
        var v = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        return _cache.SetAsync(key, v, TimeSpan.FromDays(30));
    }
}

