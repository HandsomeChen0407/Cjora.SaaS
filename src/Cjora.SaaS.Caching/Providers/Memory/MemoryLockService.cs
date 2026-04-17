using System.Collections.Concurrent;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 基于进程内 <see cref="ConcurrentDictionary{TKey,TValue}"/> 的单机锁实现（不具备跨进程互斥）。
/// </summary>
/// <remarks>
/// <para><b>原子性：</b>使用 <c>TryAdd</c> / <c>TryUpdate</c> / <c>TryRemove</c> 组合，
/// 不依赖 <see cref="Microsoft.Extensions.Caching.Memory.IMemoryCache"/>（它的 TryGetValue+Set 非原子，两个调用者可能同时获锁，是致命 bug）。</para>
/// <para><b>token 校验：</b>每次获取生成随机 token，<see cref="Handle.DisposeAsync"/> 只有在 token 匹配时才移除条目，
/// 杜绝"A 的 TTL 刚到期、B 获得同 key 锁、A 的 using 退出时误删 B 锁"。</para>
/// </remarks>
public sealed class MemoryLockService : ILockService
{
    private readonly ConcurrentDictionary<string, LockEntry> _locks = new(StringComparer.Ordinal);

    /// <inheritdoc />
    public Task<ILockHandle?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult<ILockHandle?>(null);
        if (ttl <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(ttl), "Lock TTL must be positive.");

        var token = Guid.NewGuid().ToString("N");
        var expireAt = DateTime.UtcNow + ttl;
        var entry = new LockEntry(token, expireAt);

        if (_locks.TryAdd(key, entry))
        {
            CacheMetrics.LocksAcquired.Add(1, CacheMetrics.Provider("Memory"));
            return Task.FromResult<ILockHandle?>(new Handle(_locks, key, token));
        }

        if (_locks.TryGetValue(key, out var existing))
        {
            if (existing.ExpireAt > DateTime.UtcNow)
            {
                CacheMetrics.LocksContended.Add(1, CacheMetrics.Provider("Memory"));
                return Task.FromResult<ILockHandle?>(null);
            }

            if (_locks.TryUpdate(key, entry, existing))
            {
                CacheMetrics.LocksAcquired.Add(1, CacheMetrics.Provider("Memory"));
                return Task.FromResult<ILockHandle?>(new Handle(_locks, key, token));
            }
        }

        CacheMetrics.LocksContended.Add(1, CacheMetrics.Provider("Memory"));
        return Task.FromResult<ILockHandle?>(null);
    }

    private sealed record LockEntry(string Token, DateTime ExpireAt);

    private sealed class Handle(ConcurrentDictionary<string, LockEntry> locks, string key, string token) : ILockHandle
    {
        private int _disposed;

        public string Key { get; } = key;

        public ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 1)
                return ValueTask.CompletedTask;

            if (locks.TryGetValue(Key, out var current)
                && string.Equals(current.Token, token, StringComparison.Ordinal))
            {
                // 只在 token 匹配时移除；跨实例或 TTL 自然过期后被其它持有者占用的场景不会误删。
                var kvp = new KeyValuePair<string, LockEntry>(Key, current);
                ((ICollection<KeyValuePair<string, LockEntry>>)locks).Remove(kvp);
            }

            return ValueTask.CompletedTask;
        }
    }
}
