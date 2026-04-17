using System.Collections.Concurrent;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Microsoft.Extensions.Logging;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>进程内缓存失效总线：仅同进程订阅者收到通知，适用于单实例部署。</summary>
/// <remarks>
/// <para><b>模型：</b>每个订阅者 = 一个 <see cref="Subscription"/>（GUID 主键 + pattern + handler），
/// 发布时对<b>快照</b>数组遍历，期间并发 <c>Subscribe/Unsubscribe</c> 不影响当前扇出，也不会遗漏或重复。</para>
/// <para><b>异常隔离：</b>单个 handler 抛异常打点 <c>cjora.cache.invalidation_handler_errors</c>、
/// 记录 <c>LogWarning</c>，不再用 <c>catch {}</c> 静默吞咽。</para>
/// <para><b>Dispose 后再调用：</b><see cref="PublishAsync"/> 直接返回（不再静默 no-op），
/// <see cref="SubscribeAsync"/> 抛 <see cref="ObjectDisposedException"/>。</para>
/// </remarks>
public sealed class MemoryCacheInvalidationBus : ICacheInvalidationBus
{
    private readonly ConcurrentDictionary<Guid, Subscription> _subs = new();
    private readonly ILogger<MemoryCacheInvalidationBus> _logger;
    private int _disposed;

    /// <summary>DI 构造。</summary>
    public MemoryCacheInvalidationBus(ILogger<MemoryCacheInvalidationBus> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task PublishAsync(string key, CancellationToken cancellationToken = default)
    {
        if (Volatile.Read(ref _disposed) == 1)
            return;
        if (string.IsNullOrEmpty(key))
            return;

        // 快照遍历：ConcurrentDictionary 自身 enumerator 是弱一致，要想精确扇出必须拷贝。
        var snapshot = _subs.Values.ToArray();
        foreach (var sub in snapshot)
        {
            if (cancellationToken.IsCancellationRequested)
                return;
            if (!SubscriptionPatternMatcher.IsMatch(sub.Pattern, key))
                continue;

            try
            {
                await sub.Handler(key).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                CacheMetrics.InvalidationHandlerErrors.Add(1, CacheMetrics.Provider("Memory"));
                _logger.LogWarning(ex,
                    "MemoryCacheInvalidationBus handler error. Pattern={Pattern}, Key={Key}",
                    sub.Pattern, key);
            }
        }
    }

    /// <inheritdoc />
    public Task<IAsyncDisposable> SubscribeAsync(string pattern, Func<string, Task> handler, CancellationToken cancellationToken = default)
    {
        if (Volatile.Read(ref _disposed) == 1)
            throw new ObjectDisposedException(nameof(MemoryCacheInvalidationBus));

        ArgumentNullException.ThrowIfNull(handler);
        SubscriptionPatternMatcher.Validate(pattern, nameof(pattern));
        cancellationToken.ThrowIfCancellationRequested();

        var id = Guid.NewGuid();
        _subs[id] = new Subscription(pattern, handler);
        return Task.FromResult<IAsyncDisposable>(new Unsubscriber(_subs, id));
    }

    /// <inheritdoc />
    public ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposed, 1) == 1)
            return ValueTask.CompletedTask;

        _subs.Clear();
        return ValueTask.CompletedTask;
    }

    private sealed record Subscription(string Pattern, Func<string, Task> Handler);

    private sealed class Unsubscriber(ConcurrentDictionary<Guid, Subscription> subs, Guid id) : IAsyncDisposable
    {
        private int _disposed;

        public ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 1)
                return ValueTask.CompletedTask;

            subs.TryRemove(id, out _);
            return ValueTask.CompletedTask;
        }
    }
}
