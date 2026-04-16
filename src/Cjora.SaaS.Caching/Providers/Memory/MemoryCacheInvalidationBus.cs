using System.Collections.Concurrent;
using Cjora.SaaS.Caching.Abstractions;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 进程内缓存失效总线：仅同进程订阅者收到通知，适用于单实例部署。
/// </summary>
public sealed class MemoryCacheInvalidationBus : ICacheInvalidationBus
{
    private readonly ConcurrentDictionary<string, List<Func<string, Task>>> _subscriptions = new();

    /// <inheritdoc />
    public async Task PublishAsync(string key, CancellationToken cancellationToken = default)
    {
        foreach (var kvp in _subscriptions)
        {
            if (key.StartsWith(kvp.Key, StringComparison.Ordinal) || kvp.Key == "*")
            {
                foreach (var handler in kvp.Value)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    try { await handler(key).ConfigureAwait(false); }
                    catch { /* 订阅方异常不影响广播 */ }
                }
            }
        }
    }

    /// <inheritdoc />
    public Task SubscribeAsync(string pattern, Func<string, Task> handler, CancellationToken cancellationToken = default)
    {
        var handlers = _subscriptions.GetOrAdd(pattern, _ => new List<Func<string, Task>>());
        lock (handlers)
        {
            handlers.Add(handler);
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
