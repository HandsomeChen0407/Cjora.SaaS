using System.Collections.Concurrent;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 <see cref="IMemoryCache"/> + <see cref="ConcurrentDictionary{TKey,TValue}"/> 的单机 HashMap 实现。</summary>
public sealed class MemoryHashMapService : IHashMapService
{
    private readonly IMemoryCache _cache;
    private readonly CacheOptions _options;

    public MemoryHashMapService(IMemoryCache cache, IOptions<CacheOptions> options)
    {
        _cache = cache;
        _options = options.Value;
    }

    public Task SetFieldAsync<T>(string key, string field, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        GetOrCreateDict(key, expire)[field] = value!;
        return Task.CompletedTask;
    }

    public Task SetFieldsAsync<T>(string key, IEnumerable<KeyValuePair<string, T>> fields, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        var dict = GetOrCreateDict(key, expire);
        foreach (var kv in fields)
            dict[kv.Key] = kv.Value!;

        return Task.CompletedTask;
    }

    public Task<T?> GetFieldAsync<T>(string key, string field, CancellationToken cancellationToken = default)
    {
        if (!_cache.TryGetValue(key, out ConcurrentDictionary<string, object>? dict) || dict is null)
            return Task.FromResult<T?>(default);

        return Task.FromResult(dict.TryGetValue(field, out var v) && v is T typed ? typed : default(T?));
    }

    public Task<Dictionary<string, T>> GetAllAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (!_cache.TryGetValue(key, out ConcurrentDictionary<string, object>? dict) || dict is null)
            return Task.FromResult(new Dictionary<string, T>());

        var result = new Dictionary<string, T>(dict.Count, StringComparer.Ordinal);
        foreach (var kv in dict)
        {
            if (kv.Value is T typed)
                result[kv.Key] = typed;
        }

        return Task.FromResult(result);
    }

    public Task RemoveFieldsAsync(string key, IEnumerable<string> fields, CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(key, out ConcurrentDictionary<string, object>? dict) && dict is not null)
        {
            foreach (var field in fields)
                dict.TryRemove(field, out _);
        }

        return Task.CompletedTask;
    }

    public Task<bool> FieldExistsAsync(string key, string field, CancellationToken cancellationToken = default)
    {
        if (!_cache.TryGetValue(key, out ConcurrentDictionary<string, object>? dict) || dict is null)
            return Task.FromResult(false);

        return Task.FromResult(dict.ContainsKey(field));
    }

    public Task<long> IncrementAsync(string key, string field, long value = 1, CancellationToken cancellationToken = default)
    {
        var dict = GetOrCreateDict(key, expire: null);
        var result = dict.AddOrUpdate(
            field,
            _ => (object)value,
            (_, existing) => (long)(existing is long l ? l + value : value));

        return Task.FromResult((long)result);
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }

    private ConcurrentDictionary<string, object> GetOrCreateDict(string key, TimeSpan? expire)
    {
        return _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));
            return new ConcurrentDictionary<string, object>(StringComparer.Ordinal);
        })!;
    }
}
