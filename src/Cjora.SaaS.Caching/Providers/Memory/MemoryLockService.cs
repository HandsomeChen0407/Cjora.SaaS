using Cjora.SaaS.Caching.Abstractions;
using Microsoft.Extensions.Caching.Memory;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 <see cref="IMemoryCache"/> 的单机锁实现（不具备跨进程互斥）。</summary>
public sealed class MemoryLockService : ILockService
{
    private readonly IMemoryCache _cache;

    public MemoryLockService(IMemoryCache cache) => _cache = cache;

    public Task<ILockHandle?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
            return Task.FromResult<ILockHandle?>(null);

        if (_cache.TryGetValue(key, out _))
            return Task.FromResult<ILockHandle?>(null);

        _cache.Set(key, "1", new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
        return Task.FromResult<ILockHandle?>(new Handle(_cache, key));
    }

    private sealed class Handle(IMemoryCache cache, string key) : ILockHandle
    {
        public string Key { get; } = key;

        public ValueTask DisposeAsync()
        {
            cache.Remove(Key);
            return ValueTask.CompletedTask;
        }
    }
}
