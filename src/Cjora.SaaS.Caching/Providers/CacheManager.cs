using System.Diagnostics;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 统一缓存入口实现。组合 <see cref="ICachingService"/> 与 <see cref="ICacheInvalidationBus"/>，
/// 关注点：强类型 Key、按模块 TTL、显式失效广播、全链路 <see cref="CancellationToken"/> 透传。
/// </summary>
/// <remarks>
/// <para><b>一致性语义（重要）：</b></para>
/// <list type="bullet">
///   <item><description><see cref="SetAsync{T}"/>：只写入底层存储，<b>不广播</b>；</description></item>
///   <item><description><see cref="RemoveAsync"/>：先删除存储，再 best-effort 广播失效——两步<b>非原子</b>，
///     进程崩溃窗口内外部 L1 可能短暂 stale（TTL / 版本号兜底）。广播失败<b>不</b>向业务抛，但会打点与记录日志；</description></item>
///   <item><description><see cref="InvalidateAsync"/>：仅广播，不触碰存储，配合"版本号 Bump 已提交"场景。广播失败抛出，
///     业务可决定重试或降级。</description></item>
/// </list>
/// </remarks>
public sealed class CacheManager : ICacheManager
{
    private readonly ICachingService _cache;
    private readonly ICacheInvalidationBus _bus;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;
    private readonly ILogger<CacheManager> _logger;

    /// <summary>DI 构造。</summary>
    public CacheManager(
        ICachingService cache,
        ICacheInvalidationBus bus,
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<CacheManager> logger)
    {
        _cache = cache;
        _bus = bus;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<T?> GetAsync<T>(CacheKey key, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        using var activity = StartSpan("cache.get", key);
        return await _cache.GetAsync<T>(ApplyPrefix(key), cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task SetAsync<T>(CacheKey key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        var ttl = expire ?? _optionsMonitor.CurrentValue.ResolveTtl(key.Module);
        using var activity = StartSpan("cache.set", key, ttl);
        await _cache.SetAsync(ApplyPrefix(key), value, ttl, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<bool> SetIfAbsentAsync<T>(CacheKey key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        var ttl = expire ?? _optionsMonitor.CurrentValue.ResolveTtl(key.Module);
        using var activity = StartSpan("cache.setnx", key, ttl);
        return await _cache.SetIfAbsentAsync(ApplyPrefix(key), value, ttl, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<TimeSpan?> GetTtlAsync(CacheKey key, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        using var activity = StartSpan("cache.ttl", key);
        return await _cache.GetTtlAsync(ApplyPrefix(key), cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task RemoveAsync(CacheKey key, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        var full = ApplyPrefix(key);
        using var activity = StartSpan("cache.remove", key);
        await _cache.RemoveAsync(full, cancellationToken).ConfigureAwait(false);
        await SafePublishInvalidationAsync(full, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task RemoveWithBroadcastAsync(CacheKey key, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        var full = ApplyPrefix(key);
        using var activity = StartSpan("cache.remove_broadcast", key);
        await _cache.RemoveAsync(full, cancellationToken).ConfigureAwait(false);
        // 严格广播：失败向业务抛出，不再 safe-swallow。
        await _bus.PublishAsync(full, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public Task InvalidateAsync(CacheKey key, CancellationToken cancellationToken = default)
    {
        key.EnsureValid();
        // 显式广播：失败让调用方感知，由其决定 retry / 降级。
        // 不再单独起 span：RedisCacheInvalidationBus.PublishAsync 内部已起 cache.invalidate.publish span。
        return _bus.PublishAsync(ApplyPrefix(key), cancellationToken);
    }

    private static Activity? StartSpan(string operation, CacheKey key, TimeSpan? ttl = null)
    {
        // 无监听者时 StartActivity 返回 null，整块几乎零成本（即使在 hot path 也安全）。
        var activity = CacheTelemetry.ActivitySource.StartActivity(
            name: operation,
            kind: ActivityKind.Client);
        if (activity is null)
            return null;

        activity.SetTag("cjora.cache.module", key.Module);
        activity.SetTag("cjora.cache.op", operation);
        // CacheKey.Value 可能带租户/用户标识，已是结构化 key，非 PII；仅记录 key 以支撑定位。
        activity.SetTag("cjora.cache.key", key.Value);
        if (ttl is { } t)
        {
            activity.SetTag("cjora.cache.ttl_ms", (long)t.TotalMilliseconds);
        }
        return activity;
    }

    private string ApplyPrefix(CacheKey key) => _optionsMonitor.CurrentValue.ApplyKeyPrefix(key.Value);

    private async Task SafePublishInvalidationAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            await _bus.PublishAsync(key, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            // RemoveAsync 路径：广播失败不应阻断业务逻辑；外部 L1 最终靠 TTL / 版本号兜底。
            // 但会计数 + LogWarning 暴露给运维，避免"写完删完 L1 永远不失效"彻底静默。
            CacheMetrics.InvalidationPublishFailures.Add(1, CacheMetrics.Op("remove"));
            _logger.LogWarning(ex, "CacheManager publish invalidation failed. Key={Key}", key);
        }
    }
}
