using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis STRING 命令的缓存实现，值以 JSON 序列化存储。</summary>
public sealed class RedisCacheService : ICachingService
{
    private static readonly JsonSerializerSettings JsonSettings = new() { NullValueHandling = NullValueHandling.Ignore };

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
        return raw.IsNullOrEmpty ? default : JsonConvert.DeserializeObject<T>(raw!, JsonSettings);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expire = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            return;

        var ttl = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));
        var raw = JsonConvert.SerializeObject(value, JsonSettings);
        await Db.StringSetAsync(key, raw, ttl).ConfigureAwait(false);
    }

    public async Task RemoveAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return;

        await Db.KeyDeleteAsync(key).ConfigureAwait(false);
    }
}
