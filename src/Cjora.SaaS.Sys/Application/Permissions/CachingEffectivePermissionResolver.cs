using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Cjora.SaaS.Sys.Permissions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Application.Permissions;

/// <summary>
/// 为有效权限码解析增加短 TTL 内存缓存。
/// </summary>
public sealed class CachingEffectivePermissionResolver : IEffectivePermissionResolver
{
    private readonly EffectivePermissionResolver _inner;
    private readonly IMemoryCache _cache;
    private readonly ICurrentUser _currentUser;
    private readonly SysSecurityCacheGeneration _generation;
    private readonly SysSecurityCacheOptions _options;

    public CachingEffectivePermissionResolver(
        EffectivePermissionResolver inner,
        IMemoryCache cache,
        ICurrentUser currentUser,
        SysSecurityCacheGeneration generation,
        IOptions<SysSecurityCacheOptions> options)
    {
        _inner = inner;
        _cache = cache;
        _currentUser = currentUser;
        _generation = generation;
        _options = options.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || string.IsNullOrEmpty(_currentUser.TenantId))
        {
            return await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
        }

        var gen = _generation.Permission;
        var cacheKey = $"cjora:perm:{_currentUser.TenantId}:{userId}:{gen}";
        if (_cache.TryGetValue(cacheKey, out IReadOnlySet<string>? cached) && cached is not null)
        {
            return cached;
        }

        var fresh = await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
        _cache.Set(
            cacheKey,
            fresh,
            new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(
                    Math.Clamp(_options.AbsoluteExpirationMinutes, 5, 10))
            });
        return fresh;
    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<long>> GetEffectivePermissionIdsAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _inner.GetEffectivePermissionIdsAsync(userId, cancellationToken).ConfigureAwait(false);
    }
}
