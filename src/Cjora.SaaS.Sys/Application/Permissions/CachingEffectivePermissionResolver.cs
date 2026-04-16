using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Cjora.SaaS.Sys.Permissions;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Application.Permissions;

/// <summary>
/// 为有效权限码解析增加短 TTL 内存缓存。
/// </summary>
public sealed class CachingEffectivePermissionResolver : IEffectivePermissionResolver
{
    private const string Module = "sys";
    private readonly EffectivePermissionResolver _inner;
    private readonly ICachingService _cache;
    private readonly ILockService _lock;
    private readonly ICurrentUser _currentUser;
    private readonly SysSecurityCacheVersionStore _versions;
    private readonly CacheOptions _options;

    public CachingEffectivePermissionResolver(
        EffectivePermissionResolver inner,
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
    public async Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || string.IsNullOrEmpty(_currentUser.TenantId))
        {
            return await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
        }

        var ver = await _versions.GetPermissionVersionAsync(cancellationToken).ConfigureAwait(false);
        var cacheKey = SaaSCacheKeys.UserScoped(Module, "perm", _currentUser.TenantId, userId, ver);

        var cached = await _cache.GetAsync<HashSet<string>>(cacheKey).ConfigureAwait(false);
        if (cached is not null)
        {
            return cached;
        }

        var lockKey = SaaSCacheKeys.Lock(Module, "perm", $"{_currentUser.TenantId}:{userId}");
        var handle = await _lock.TryAcquireAsync(lockKey, TimeSpan.FromSeconds(5), cancellationToken).ConfigureAwait(false);
        if (handle is not null)
        {
            await using (handle.ConfigureAwait(false))
            {
                // double-check
                cached = await _cache.GetAsync<HashSet<string>>(cacheKey).ConfigureAwait(false);
                if (cached is not null)
                {
                    return cached;
                }

                var freshLocked = await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
                await _cache.SetAsync(
                        cacheKey,
                        freshLocked.ToHashSet(StringComparer.Ordinal),
                        TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10)))
                    .ConfigureAwait(false);

                return freshLocked;
            }
        }

        // 未抢到锁：直接重算（避免阻塞），但仍会写入缓存。
        var fresh = await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
        await _cache.SetAsync(
                cacheKey,
                fresh.ToHashSet(StringComparer.Ordinal),
                TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10)))
            .ConfigureAwait(false);
        return fresh;

    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<long>> GetEffectivePermissionIdsAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _inner.GetEffectivePermissionIdsAsync(userId, cancellationToken).ConfigureAwait(false);
    }
}
