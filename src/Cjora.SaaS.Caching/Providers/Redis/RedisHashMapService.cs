using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis HASH 命令集的 HashMap 实现。</summary>
public sealed class RedisHashMapService : IHashMapService
{
    private static readonly JsonSerializerSettings JsonSettings = new() { NullValueHandling = NullValueHandling.Ignore };

    private readonly IConnectionMultiplexer _mux;
    private readonly CacheOptions _options;

    public RedisHashMapService(IConnectionMultiplexer mux, IOptions<CacheOptions> options)
    {
        _mux = mux;
        _options = options.Value;
    }

    private IDatabase Db => _mux.GetDatabase(_options.Redis.Database);

    public async Task SetFieldAsync<T>(string key, string field, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        await Db.HashSetAsync(key, field, JsonConvert.SerializeObject(value, JsonSettings)).ConfigureAwait(false);
        await ApplyExpireAsync(key, expire).ConfigureAwait(false);
    }

    public async Task SetFieldsAsync<T>(string key, IEnumerable<KeyValuePair<string, T>> fields, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        var entries = fields
            .Select(kv => new HashEntry(kv.Key, JsonConvert.SerializeObject(kv.Value, JsonSettings)))
            .ToArray();

        await Db.HashSetAsync(key, entries).ConfigureAwait(false);
        await ApplyExpireAsync(key, expire).ConfigureAwait(false);
    }

    public async Task<T?> GetFieldAsync<T>(string key, string field, CancellationToken cancellationToken = default)
    {
        var raw = await Db.HashGetAsync(key, field).ConfigureAwait(false);
        return raw.IsNullOrEmpty ? default : JsonConvert.DeserializeObject<T>(raw!, JsonSettings);
    }

    public async Task<Dictionary<string, T>> GetAllAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var entries = await Db.HashGetAllAsync(key).ConfigureAwait(false);
        var result = new Dictionary<string, T>(entries.Length, StringComparer.Ordinal);

        foreach (var entry in entries)
        {
            if (!entry.Value.IsNullOrEmpty)
            {
                var val = JsonConvert.DeserializeObject<T>(entry.Value!, JsonSettings);
                if (val is not null)
                    result[entry.Name!] = val;
            }
        }

        return result;
    }

    public async Task RemoveFieldsAsync(string key, IEnumerable<string> fields, CancellationToken cancellationToken = default)
    {
        var hashFields = fields.Select(f => (RedisValue)f).ToArray();
        await Db.HashDeleteAsync(key, hashFields).ConfigureAwait(false);
    }

    public async Task<bool> FieldExistsAsync(string key, string field, CancellationToken cancellationToken = default)
        => await Db.HashExistsAsync(key, field).ConfigureAwait(false);

    public async Task<long> IncrementAsync(string key, string field, long value = 1, CancellationToken cancellationToken = default)
        => await Db.HashIncrementAsync(key, field, value).ConfigureAwait(false);

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        => await Db.KeyDeleteAsync(key).ConfigureAwait(false);

    private async Task ApplyExpireAsync(string key, TimeSpan? expire)
    {
        var ttl = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));
        await Db.KeyExpireAsync(key, ttl).ConfigureAwait(false);
    }
}
