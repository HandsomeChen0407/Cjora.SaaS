using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Infrastructure.DataPermission;

/// <summary>
/// 为 <see cref="IDataPermissionResolver"/> 增加短 TTL 内存缓存（按租户+用户）。
/// </summary>
public sealed class CachingDataPermissionResolver : IDataPermissionResolver
{
    private readonly SysSecuredDataPermissionResolver _inner;
    private readonly IMemoryCache _cache;
    private readonly ICurrentUser _currentUser;
    private readonly SysSecurityCacheGeneration _generation;
    private readonly SysSecurityCacheOptions _options;

    public CachingDataPermissionResolver(
        SysSecuredDataPermissionResolver inner,
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
    public Task<DataPermissionResult> ResolveAsync() => ResolveCoreAsync();

    private async Task<DataPermissionResult> ResolveCoreAsync()
    {
        if (_currentUser.UserId <= 0 || string.IsNullOrEmpty(_currentUser.TenantId))
        {
            return await _inner.ResolveAsync().ConfigureAwait(false);
        }

        var gen = _generation.DataPermission;
        var cacheKey = $"cjora:dp:{_currentUser.TenantId}:{_currentUser.UserId}:{gen}";
        if (_cache.TryGetValue(cacheKey, out DataPermissionResult? cached) && cached is not null)
        {
            return cached;
        }

        var fresh = await _inner.ResolveAsync().ConfigureAwait(false);
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
}

