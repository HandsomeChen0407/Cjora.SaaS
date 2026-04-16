using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis SET NX PX + Lua 安全释放的分布式锁实现。</summary>
public sealed class RedisLockService : ILockService
{
    private const string ReleaseScript =
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

    private readonly IConnectionMultiplexer _mux;
    private readonly CacheOptions _options;

    public RedisLockService(IConnectionMultiplexer mux, IOptions<CacheOptions> options)
    {
        _mux = mux;
        _options = options.Value;
    }

    private IDatabase Db => _mux.GetDatabase(_options.Redis.Database);

    public async Task<ILockHandle?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var token = Guid.NewGuid().ToString("N");
        var ok = await Db.StringSetAsync(key, token, ttl, when: When.NotExists).ConfigureAwait(false);
        return ok ? new Handle(Db, key, token) : null;
    }

    private sealed class Handle(IDatabase db, string key, string token) : ILockHandle
    {
        private int _disposed;

        public string Key { get; } = key;

        public async ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 1)
                return;

            try
            {
                await db.ScriptEvaluateAsync(ReleaseScript, new RedisKey[] { Key }, new RedisValue[] { token })
                    .ConfigureAwait(false);
            }
            catch
            {
                // 锁 TTL 兜底，释放失败不影响业务。
            }
        }
    }
}
