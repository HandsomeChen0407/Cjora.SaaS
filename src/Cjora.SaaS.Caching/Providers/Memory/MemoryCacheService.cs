using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 <see cref="IMemoryCache"/> 的单机缓存实现。</summary>
public sealed class MemoryCacheService : ICachingService
{
    private readonly IMemoryCache _cache;
    private readonly CacheOptions _options;

    public MemoryCacheService(IMemoryCache cache, IOptions<CacheOptions> options)
    {
        _cache = cache;
        _options = options.Value;
    }

    public Task<T?> GetAsync<T>(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult<T?>(default);

        return Task.FromResult(_cache.TryGetValue(key, out T? v) ? v : default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expire = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            return Task.CompletedTask;

        var ttl = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));
        _cache.Set(key, value, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key)
    {
        if (!string.IsNullOrWhiteSpace(key))
            _cache.Remove(key);

        return Task.CompletedTask;
    }
}
