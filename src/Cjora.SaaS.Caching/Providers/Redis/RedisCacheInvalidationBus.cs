using System.Collections.Concurrent;
using System.Threading.Channels;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Hosting;
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
/// <para><b>启动期预热：</b>配套 <see cref="RedisCacheInvalidationBusSubscribeHost"/> 作为
/// <see cref="IHostedService"/>，在 StartAsync 阶段立即建立 Redis channel 订阅，消除"业务首次
/// <see cref="SubscribeAsync"/> 前到达的消息被丢"的启动期 race。</para>
/// <para><b>消费模型（背压 + per-key 有序）：</b>Redis 投递线程只做 enqueue 到有界
/// <see cref="System.Threading.Channels.Channel{T}"/>；后台若干 worker 按 key 哈希分桶保证同 key 消息<b>严格有序</b>，
/// 避免原实现"每条消息 × 每订阅者 <c>Task.Run</c>"在消息洪峰下打爆 ThreadPool，以及后到的 invalidate
/// 在任务调度中乱序执行覆盖本地 L1 的问题。队列满时会 LogWarning + 打点
/// <c>cjora.cache.invalidation_publish_failures</c>（以 <c>op=enqueue-drop</c> 区分），并丢弃最老一条，
/// 保证系统不被慢 handler 拖死。</para>
/// <para><b>已知局限：</b>Redis Pub/Sub 不做消息持久化，新连接 / 重启期间无法获取历史失效事件，
/// 故本实现仅作为"最终一致性的加速器"。强一致场景请配合 <c>SaaSCacheKeys.Version</c> 版本号方案与 TTL 兜底；
/// 若需要可靠交付，应替换为 Redis Streams / Kafka 等有持久化的总线。</para>
/// </remarks>
public sealed class RedisCacheInvalidationBus : ICacheInvalidationBus
{
    private const int WorkerCount = 4;
    private const int QueueCapacity = 10_000;

    private readonly ISubscriber _subscriber;
    private readonly ILogger<RedisCacheInvalidationBus> _logger;
    private readonly RedisChannel _channel;
    private readonly ConcurrentDictionary<Guid, Subscription> _subs = new();
    private readonly Action<RedisChannel, RedisValue> _channelHandler;
    private readonly SemaphoreSlim _channelInitLock = new(1, 1);

    private readonly Channel<string>[] _workerQueues;
    private readonly Task[] _workerTasks;
    private readonly CancellationTokenSource _workerCts = new();

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

        _workerQueues = new Channel<string>[WorkerCount];
        _workerTasks = new Task[WorkerCount];
        for (var i = 0; i < WorkerCount; i++)
        {
            _workerQueues[i] = Channel.CreateBounded<string>(new BoundedChannelOptions(QueueCapacity)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = false,
            });
            _workerTasks[i] = Task.Run(() => WorkerLoopAsync(_workerQueues[i], _workerCts.Token));
        }

        // InvalidationChannel 运行期变更无法生效（_channel 是 readonly、StackExchange.Redis 的订阅绑定在
        // 具体 channel 上）；给 Ops 一个显式告警，避免"改了配置，但两个实例长期互不通信"。
        optionsMonitor.OnChange(opts =>
        {
            if (!string.Equals(opts.Redis.InvalidationChannel, channelName, StringComparison.Ordinal))
            {
                _logger.LogWarning(
                    "RedisCacheInvalidationBus: InvalidationChannel changed from '{Old}' to '{New}' at runtime, but live subscriptions cannot be rewired. Restart required.",
                    channelName, opts.Redis.InvalidationChannel);
            }
        });
    }

    /// <summary>供 <see cref="RedisCacheInvalidationBusSubscribeHost"/> 启动期预热调用。</summary>
    internal Task WarmUpAsync(CancellationToken cancellationToken) => EnsureChannelSubscribedAsync();

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

        // 按 key 哈希分桶：同 key 消息永远进同一个 worker，保证 "先到先处理"。
        var bucket = (int)((uint)StringComparer.Ordinal.GetHashCode(key) % (uint)WorkerCount);
        var queue = _workerQueues[bucket];

        // Bounded + DropOldest：队列满时自动丢弃最老一条，保证生产侧（Redis 回调线程）不被阻塞，
        // 避免"慢 handler → 回调线程堆积 → 整个 StackExchange.Redis 消息泵停滞"。
        if (!queue.Writer.TryWrite(key))
        {
            CacheMetrics.InvalidationPublishFailures.Add(1,
                CacheMetrics.Provider("Redis"),
                CacheMetrics.Op("enqueue-drop"));
            _logger.LogWarning(
                "RedisCacheInvalidationBus: worker queue[{Bucket}] saturated, dropped oldest. Key={Key}", bucket, key);
        }
    }

    private async Task WorkerLoopAsync(Channel<string> queue, CancellationToken cancellationToken)
    {
        try
        {
            await foreach (var key in queue.Reader.ReadAllAsync(cancellationToken).ConfigureAwait(false))
            {
                if (Volatile.Read(ref _disposed) == 1)
                    return;

                var snapshot = _subs.Values.ToArray();
                foreach (var sub in snapshot)
                {
                    if (!SubscriptionPatternMatcher.IsMatch(sub.Pattern, key))
                        continue;

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
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Dispose 触发，正常退出。
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

        foreach (var q in _workerQueues)
            q.Writer.TryComplete();

        _workerCts.Cancel();
        try
        {
            await Task.WhenAny(Task.WhenAll(_workerTasks), Task.Delay(TimeSpan.FromSeconds(2)))
                .ConfigureAwait(false);
        }
        catch
        {
            // 忽略：worker 内部异常已在 WorkerLoopAsync 打日志。
        }

        _workerCts.Dispose();
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

/// <summary>
/// 启动期预热 <see cref="RedisCacheInvalidationBus"/> 的 channel 订阅：
/// 在 <see cref="IHostedService.StartAsync"/> 阶段立即建立 Redis Pub/Sub 订阅，
/// 消除"业务首次 SubscribeAsync 前 Pub/Sub 消息丢失"的 race。
/// </summary>
internal sealed class RedisCacheInvalidationBusSubscribeHost : IHostedService
{
    private readonly ICacheInvalidationBus _bus;
    private readonly ILogger<RedisCacheInvalidationBusSubscribeHost> _logger;

    public RedisCacheInvalidationBusSubscribeHost(
        ICacheInvalidationBus bus,
        ILogger<RedisCacheInvalidationBusSubscribeHost> logger)
    {
        _bus = bus;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (_bus is RedisCacheInvalidationBus redisBus)
        {
            try
            {
                await redisBus.WarmUpAsync(cancellationToken).ConfigureAwait(false);
                _logger.LogInformation("RedisCacheInvalidationBus channel warm-up completed.");
            }
            catch (Exception ex)
            {
                // Redis 暂不可达时不阻断启动，Subscribe 会在业务首次调用时重试。
                _logger.LogWarning(ex, "RedisCacheInvalidationBus warm-up failed, will retry on first Subscribe.");
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
