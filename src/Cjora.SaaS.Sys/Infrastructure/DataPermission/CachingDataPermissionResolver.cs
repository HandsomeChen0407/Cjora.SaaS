using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Infrastructure.DataPermission;

/// <summary>
/// 为 <see cref="IDataPermissionResolver"/> 增加短 TTL 内存缓存（按租户+用户）。
/// </summary>
public sealed class CachingDataPermissionResolver : IDataPermissionResolver
{
    private const string Module = "sys";
    private readonly SysSecuredDataPermissionResolver _inner;
    private readonly ICachingService _cache;
    private readonly ILockService _lock;
    private readonly ICurrentUser _currentUser;
    private readonly SysSecurityCacheVersionStore _versions;
    private readonly CacheOptions _options;

    public CachingDataPermissionResolver(
        SysSecuredDataPermissionResolver inner,
        ICachingService cache,
        ILockService @lock,
        ICurrentUser currentUser,
        SysSecurityCacheVersionStore versions,
        IOptions<CacheOptions> options)
    {
        _inner = inner;
        _cache = cache;
        _lock = @lock;
        _currentUser = currentUser;
        _versions = versions;
        _options = options.Value;
    }

    /// <inheritdoc />
    public Task<DataPermissionResult> ResolveAsync() => ResolveCoreAsync();

    private async Task<DataPermissionResult> ResolveCoreAsync()
    {
        if (_currentUser.UserId <= 0 || string.IsNullOrEmpty(_currentUser.TenantId))
        {
            return await _inner.ResolveAsync().ConfigureAwait(false);
        }

        var ver = await _versions.GetDataPermissionVersionAsync().ConfigureAwait(false);
        var cacheKey = SaaSCacheKeys.UserScoped(Module, "scope", _currentUser.TenantId, _currentUser.UserId, ver);
        var cached = await _cache.GetAsync<DataPermissionResult>(cacheKey).ConfigureAwait(false);
        if (cached is not null)
        {
            return cached;
        }

        var lockKey = SaaSCacheKeys.Lock(Module, "scope", $"{_currentUser.TenantId}:{_currentUser.UserId}");
        var handle = await _lock.TryAcquireAsync(lockKey, TimeSpan.FromSeconds(5), CancellationToken.None).ConfigureAwait(false);
        if (handle is not null)
        {
            await using (handle.ConfigureAwait(false))
            {
                cached = await _cache.GetAsync<DataPermissionResult>(cacheKey).ConfigureAwait(false);
                if (cached is not null)
                {
                    return cached;
                }

                var freshLocked = await _inner.ResolveAsync().ConfigureAwait(false);
                await _cache.SetAsync(
                        cacheKey,
                        freshLocked,
                        TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10)))
                    .ConfigureAwait(false);
                return freshLocked;
            }
        }

        var fresh = await _inner.ResolveAsync().ConfigureAwait(false);
        await _cache.SetAsync(
                cacheKey,
                fresh,
                TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10)))
            .ConfigureAwait(false);
        return fresh;
    }
}

