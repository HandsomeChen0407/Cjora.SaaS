using System.Collections.Concurrent;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 基于 Redis Pub/Sub 的缓存失效广播总线。所有订阅同一 Redis 的实例均能收到通知。
/// </summary>
/// <remarks>
/// <para><b>多订阅者模型：</b>进程内对 Redis channel 只建立 <b>一次</b> 实际 Subscribe，
/// 内部维护 <see cref="ConcurrentDictionary{TKey,TValue}"/> 的订阅者表；接收到消息后在本地做 pattern 过滤扇出。
/// <see cref="SubscribeAsync"/> 返回 <see cref="IAsyncDisposable"/> 仅移除表项，不会影响其他订阅者。</para>
/// <para><b>Dispose 精细化：</b>只 <c>UnsubscribeAsync(Channel, ourHandler)</c>，<b>绝不</b>调用
/// <c>UnsubscribeAllAsync</c>——因为 <see cref="IConnectionMultiplexer.GetSubscriber"/> 返回的是<b>共享</b>对象，
/// 全局反订阅会误伤同进程内其它业务的订阅。</para>
/// <para><b>已知局限：</b>Redis Pub/Sub 不做消息持久化，新连接 / 重启期间无法获取历史失效事件，
/// 故本实现仅作为"最终一致性的加速器"。强一致场景请配合 <c>SaaSCacheKeys.Version</c> 版本号方案与 TTL 兜底；
/// 若需要可靠交付，应替换为 Redis Streams / Kafka 等有持久化的总线。</para>
/// </remarks>
public sealed class RedisCacheInvalidationBus : ICacheInvalidationBus
{
    private readonly ISubscriber _subscriber;
    private readonly ILogger<RedisCacheInvalidationBus> _logger;
    private readonly RedisChannel _channel;
    private readonly ConcurrentDictionary<Guid, Subscription> _subs = new();
    private readonly Action<RedisChannel, RedisValue> _channelHandler;
    private readonly SemaphoreSlim _channelInitLock = new(1, 1);
    private int _channelSubscribed;
    private int _disposed;

    /// <summary>DI 构造。</summary>
    public RedisCacheInvalidationBus(
        IConnectionMultiplexer redis,
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<RedisCacheInvalidationBus> logger)
    {
        _subscriber = redis.GetSubscriber();
        _logger = logger;
        var channelName = optionsMonitor.CurrentValue.Redis.InvalidationChannel;
        _channel = new RedisChannel(channelName, RedisChannel.PatternMode.Literal);
        _channelHandler = OnChannelMessage;
    }

    /// <inheritdoc />
    public async Task PublishAsync(string key, CancellationToken cancellationToken = default)
    {
        if (Volatile.Read(ref _disposed) == 1)
            return;
        if (string.IsNullOrEmpty(key))
            return;

        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            await _subscriber.PublishAsync(_channel, key).ConfigureAwait(false);
            _logger.LogDebug("RedisCacheInvalidationBus published: {Key}", key);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            CacheMetrics.InvalidationPublishFailures.Add(1, CacheMetrics.Provider("Redis"));
            _logger.LogWarning(ex, "RedisCacheInvalidationBus publish failed. Key={Key}", key);
            // 继续向上抛给 CacheManager，由其决定"日志降级还是继续抛给业务"。
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IAsyncDisposable> SubscribeAsync(string pattern, Func<string, Task> handler, CancellationToken cancellationToken = default)
    {
        if (Volatile.Read(ref _disposed) == 1)
            throw new ObjectDisposedException(nameof(RedisCacheInvalidationBus));

        ArgumentNullException.ThrowIfNull(handler);
        SubscriptionPatternMatcher.Validate(pattern, nameof(pattern));
        cancellationToken.ThrowIfCancellationRequested();

        await EnsureChannelSubscribedAsync().ConfigureAwait(false);

        var id = Guid.NewGuid();
        _subs[id] = new Subscription(pattern, handler);
        _logger.LogInformation("RedisCacheInvalidationBus subscribed. Pattern={Pattern}", pattern);
        return new Unsubscriber(_subs, id);
    }

    private async Task EnsureChannelSubscribedAsync()
    {
        if (Volatile.Read(ref _channelSubscribed) == 1)
            return;

        await _channelInitLock.WaitAsync().ConfigureAwait(false);
        try
        {
            if (Volatile.Read(ref _channelSubscribed) == 1)
                return;

            await _subscriber.SubscribeAsync(_channel, _channelHandler).ConfigureAwait(false);
            Volatile.Write(ref _channelSubscribed, 1);
        }
        finally
        {
            _channelInitLock.Release();
        }
    }

    private void OnChannelMessage(RedisChannel channel, RedisValue message)
    {
        if (Volatile.Read(ref _disposed) == 1)
            return;

        var key = message.ToString();
        if (string.IsNullOrEmpty(key))
            return;

        // ISubscriber 回调运行在 Redis 接收线程，这里对快照异步扇出，避免阻塞后续消息。
        var snapshot = _subs.Values.ToArray();
        foreach (var sub in snapshot)
        {
            if (!SubscriptionPatternMatcher.IsMatch(sub.Pattern, key))
                continue;

            _ = Task.Run(async () =>
            {
                try
                {
                    await sub.Handler(key).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    CacheMetrics.InvalidationHandlerErrors.Add(1, CacheMetrics.Provider("Redis"));
                    _logger.LogWarning(ex,
                        "RedisCacheInvalidationBus handler error. Pattern={Pattern}, Key={Key}",
                        sub.Pattern, key);
                }
            });
        }
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposed, 1) == 1)
            return;

        _subs.Clear();

        if (Volatile.Read(ref _channelSubscribed) == 1)
        {
            try
            {
                // 只反订阅本 Bus 自己注册的 handler，不碰同 ISubscriber 下的其它业务订阅。
                await _subscriber.UnsubscribeAsync(_channel, _channelHandler).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "RedisCacheInvalidationBus unsubscribe on dispose failed.");
            }
        }

        _channelInitLock.Dispose();
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
