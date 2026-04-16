using System.Text.Json;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis STRING 命令的缓存实现，值以 JSON 序列化存储。</summary>
public sealed class RedisCacheService : ICachingService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IConnectionMultiplexer _mux;
    private readonly CacheOptions _options;

    public RedisCacheService(IConnectionMultiplexer mux, IOptions<CacheOptions> options)
    {
        _mux = mux;
        _options = options.Value;
    }

    private IDatabase Db => _mux.GetDatabase(_options.Redis.Database);

    public async Task<T?> GetAsync<T>(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return default;

        var raw = await Db.StringGetAsync(key).ConfigureAwait(false);
        return raw.IsNullOrEmpty ? default : JsonSerializer.Deserialize<T>(raw!, JsonOptions);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expire = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            return;

        var ttl = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));
        var raw = JsonSerializer.Serialize(value, JsonOptions);
        await Db.StringSetAsync(key, raw, ttl).ConfigureAwait(false);
    }

    public async Task RemoveAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return;

        await Db.KeyDeleteAsync(key).ConfigureAwait(false);
    }
}
