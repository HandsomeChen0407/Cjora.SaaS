using Cjora.SaaS.Caching.Abstractions;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 基于 Redis Pub/Sub 的缓存失效广播总线。
/// 所有订阅同一 Redis 的实例均能收到失效通知，适用于多实例部署。
/// </summary>
public sealed class RedisCacheInvalidationBus : ICacheInvalidationBus
{
    private const string ChannelPrefix = "saas:cache:invalidation";
    private readonly ISubscriber _subscriber;
    private readonly ILogger<RedisCacheInvalidationBus> _logger;

    public RedisCacheInvalidationBus(
        IConnectionMultiplexer redis,
        ILogger<RedisCacheInvalidationBus> logger)
    {
        _subscriber = redis.GetSubscriber();
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task PublishAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var channel = new RedisChannel(ChannelPrefix, RedisChannel.PatternMode.Literal);
        await _subscriber.PublishAsync(channel, key).ConfigureAwait(false);
        _logger.LogDebug("CacheInvalidationBus published: {Key}", key);
    }

    /// <inheritdoc />
    public async Task SubscribeAsync(string pattern, Func<string, Task> handler, CancellationToken cancellationToken = default)
    {
        var channel = new RedisChannel(ChannelPrefix, RedisChannel.PatternMode.Literal);
        await _subscriber.SubscribeAsync(channel, async (_, message) =>
        {
            var key = message.ToString();
            if (string.IsNullOrEmpty(key)) return;

            if (pattern == "*" || key.StartsWith(pattern, StringComparison.Ordinal))
            {
                try
                {
                    await handler(key).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "CacheInvalidationBus subscriber error. Pattern={Pattern}, Key={Key}", pattern, key);
                }
            }
        }).ConfigureAwait(false);

        _logger.LogInformation("CacheInvalidationBus subscribed. Pattern={Pattern}", pattern);
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        await _subscriber.UnsubscribeAllAsync().ConfigureAwait(false);
    }
}
