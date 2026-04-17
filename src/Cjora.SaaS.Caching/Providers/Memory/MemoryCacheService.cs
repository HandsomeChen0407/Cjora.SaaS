using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 基于 <see cref="IMemoryCache"/> 的单机缓存实现。
/// </summary>
/// <remarks>
/// 所有写路径共享私有 <c>_writeGate</c> lock（不直接 lock 共享的 <see cref="IMemoryCache"/>
/// 避免公共锁反模式），与 <see cref="MemoryGeoService"/> / <see cref="MemoryHashMapService"/> 的私有 lock 分属不同作用域，
/// 进程内的 key-level 竞态各自隔离。
/// </remarks>
public sealed class MemoryCacheService : ICachingService
{
    private readonly IMemoryCache _cache;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;

    /// <summary>写路径互斥门：保障 SetAsync / SetIfAbsentAsync / RemoveAsync 之间序列化，是 SetIfAbsent 原子语义的前提。</summary>
    private readonly object _writeGate = new();

    private const string ProviderName = "Memory";

    /// <summary>DI 构造。</summary>
    public MemoryCacheService(IMemoryCache cache, IOptionsMonitor<CacheOptions> optionsMonitor)
    {
        _cache = cache;
        _optionsMonitor = optionsMonitor;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    /// <inheritdoc />
    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult<T?>(default);

        if (_cache.TryGetValue(key, out T? v))
        {
            CacheMetrics.Hits.Add(1, CacheMetrics.Provider(ProviderName), CacheMetrics.Op("get"));
            return Task.FromResult<T?>(v);
        }

        CacheMetrics.Misses.Add(1, CacheMetrics.Provider(ProviderName), CacheMetrics.Op("get"));
        return Task.FromResult<T?>(default);
    }

    /// <inheritdoc />
    public Task SetAsync<T>(string key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.CompletedTask;

        var ttl = expire ?? DefaultTtl();
        lock (_writeGate)
        {
            _cache.Set(key, value, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
        }
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.CompletedTask;

        lock (_writeGate)
        {
            _cache.Remove(key);
        }
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<bool> SetIfAbsentAsync<T>(string key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult(false);

        var ttl = expire ?? DefaultTtl();
        lock (_writeGate)
        {
            // _writeGate 覆盖本类所有写路径，Memory 单进程场景内 SetIfAbsent 的语义与 Redis SET NX PX 等价。
            // 跨进程请使用 RedisCacheService；进程内跨服务的互斥请显式走 ILockService。
            if (_cache.TryGetValue(key, out _))
                return Task.FromResult(false);

            _cache.Set(key, value, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
            return Task.FromResult(true);
        }
    }

    /// <inheritdoc />
    public Task<TimeSpan?> GetTtlAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult<TimeSpan?>(null);
    }

    /// <inheritdoc />
    public Task<TtlResult> GetTtlResultAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult(TtlResult.KeyNotExists);

        if (!_cache.TryGetValue(key, out _))
            return Task.FromResult(TtlResult.KeyNotExists);

        // IMemoryCache 不暴露剩余 TTL，只能回报"存在但不支持"。
        return Task.FromResult(TtlResult.Unsupported);
    }

    /// <inheritdoc />
    public Task<bool> KeyExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult(false);

        return Task.FromResult(_cache.TryGetValue(key, out _));
    }

    private TimeSpan DefaultTtl() => CacheOptions.ClampTtl(TimeSpan.FromMinutes(Options.DefaultExpireMinutes));
}
