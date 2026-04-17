using System.Collections.Concurrent;
using System.Globalization;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 基于自维护 <see cref="ConcurrentDictionary{TKey,TValue}"/> 的单机 HashMap 实现。
/// </summary>
/// <remarks>
/// <para><b>并发正确性：</b>采用与 <see cref="MemoryGeoService"/> 同样的自维护字典 + <c>GetOrAdd</c> 方案，
/// 根除了 <c>IMemoryCache.GetOrCreate</c> 在并发首写时各造一份、后写覆盖前写丢字段的致命 bug。</para>
/// <para><b>类型安全：</b>每个字段值以 <c>{TypeAQN}\u0001{json}</c> 形式存储，读取时校验类型标签，
/// 不匹配直接抛 <see cref="CacheTypeMismatchException"/>，避免"先写 int 后读 string 刚好 JSON 兼容"的静默类型污染。</para>
/// <para><b>容量控制：</b>单 Key 字段数上限 <see cref="MemoryCacheLimitsOptions.HashMapMaxFieldsPerKey"/>，
/// 超限策略由 <see cref="MemoryCacheLimitsOptions.OverflowPolicy"/> 决定（默认 <c>Throw</c>）。</para>
/// <para><b>TTL 语义（与 Redis 对齐）：</b>仅在 Key 首次创建时设置过期时间，后续字段写入<b>不</b>续租，
/// 与 <see cref="RedisHashMapService"/> 的 <c>ExpireWhen.HasNoExpiry</c> 行为一致，避免热写入 key 永不过期。</para>
/// </remarks>
public sealed class MemoryHashMapService : IHashMapService
{
    private const char TypeTagSeparator = '\u0001';
    private const string LongTypeTag = "System.Int64";

    private static readonly JsonSerializerSettings JsonSettings = new() { NullValueHandling = NullValueHandling.Ignore };

    private readonly ConcurrentDictionary<string, HashFieldStore> _stores = new(StringComparer.Ordinal);
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;
    private readonly ILogger<MemoryHashMapService> _logger;

    /// <summary>DI 构造。</summary>
    public MemoryHashMapService(
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<MemoryHashMapService> logger)
    {
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    /// <inheritdoc />
    public Task SetFieldAsync<T>(string key, string field, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var opts = Options;
        var dict = GetOrCreate(key, expire ?? CacheOptions.ClampTtl(TimeSpan.FromMinutes(opts.DefaultExpireMinutes)));
        lock (dict.SyncRoot)
        {
            dict.Set(key, field, Serialize(value), opts.Memory.HashMapMaxFieldsPerKey, opts.Memory.OverflowPolicy);
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task SetFieldsAsync<T>(string key, IEnumerable<KeyValuePair<string, T>> fields, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var opts = Options;
        var dict = GetOrCreate(key, expire ?? CacheOptions.ClampTtl(TimeSpan.FromMinutes(opts.DefaultExpireMinutes)));
        lock (dict.SyncRoot)
        {
            foreach (var kv in fields)
                dict.Set(key, kv.Key, Serialize(kv.Value), opts.Memory.HashMapMaxFieldsPerKey, opts.Memory.OverflowPolicy);
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<T?> GetFieldAsync<T>(string key, string field, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryGetLive(key, out var dict))
            return Task.FromResult<T?>(default);

        string? raw;
        lock (dict.SyncRoot)
        {
            raw = dict.TryGet(field);
        }

        return Task.FromResult(Deserialize<T>(key, field, raw));
    }

    /// <inheritdoc />
    public Task<Dictionary<string, T?>> GetAllAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryGetLive(key, out var dict))
            return Task.FromResult(new Dictionary<string, T?>());

        Dictionary<string, string> snapshot;
        lock (dict.SyncRoot)
        {
            snapshot = dict.Snapshot();
        }

        var result = new Dictionary<string, T?>(snapshot.Count, StringComparer.Ordinal);
        foreach (var kv in snapshot)
        {
            // 即便显式存了 null 也保留在结果里，避免"集合大小与 Redis 不一致"静默发散。
            result[kv.Key] = Deserialize<T>(key, kv.Key, kv.Value);
        }

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public Task RemoveFieldsAsync(string key, IEnumerable<string> fields, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryGetLive(key, out var dict))
            return Task.CompletedTask;

        lock (dict.SyncRoot)
        {
            foreach (var field in fields)
                dict.Remove(field);
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<bool> FieldExistsAsync(string key, string field, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryGetLive(key, out var dict))
            return Task.FromResult(false);

        lock (dict.SyncRoot)
        {
            return Task.FromResult(dict.Contains(field));
        }
    }

    /// <inheritdoc />
    public Task<long> IncrementAsync(string key, string field, long value = 1, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var opts = Options;
        var ttl = expire ?? CacheOptions.ClampTtl(TimeSpan.FromMinutes(opts.DefaultExpireMinutes));
        var dict = GetOrCreate(key, ttl);
        lock (dict.SyncRoot)
        {
            var current = dict.TryGet(field);
            var currentLong = ExtractLong(current);
            // checked 算术：溢出即抛 OverflowException，与 Redis Lua 路径的防御一致，
            // 杜绝"long.MaxValue + 1 → long.MinValue"的静默 wrap-around。
            long next;
            checked
            {
                next = currentLong + value;
            }

            // 精度安全阈值：IEEE 754 double 可精确表达的最大整数 = 2^53 - 1（= 9_007_199_254_740_992）。
            // 超出此阈值后 Redis Lua 的 tonumber 会丢精度，为保持跨 provider 一致行为，此处也拒绝。
            const long SafeIntegerMax = 9_007_199_254_740_992L;
            if (next > SafeIntegerMax || next < -SafeIntegerMax)
                throw new OverflowException(
                    $"MemoryHashMapService.IncrementAsync result {next} exceeds 2^53 precision limit (key={key}, field={field}).");

            var packed = $"{LongTypeTag}{TypeTagSeparator}{next.ToString(CultureInfo.InvariantCulture)}";

            // 先写后返回：容量溢出且策略=Throw 时抛异常，调用方感知"递增未落地"，杜绝"值已改但持久化失败"假象。
            dict.Set(key, field, packed, opts.Memory.HashMapMaxFieldsPerKey, opts.Memory.OverflowPolicy);
            return Task.FromResult(next);
        }
    }

    /// <inheritdoc />
    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _stores.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    /// <summary>清理所有 ExpireAt &lt;= now 的容器条目，供后台 reaper 调用。</summary>
    internal void SweepExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var kv in _stores)
        {
            bool expired;
            lock (kv.Value.SyncRoot)
            {
                expired = kv.Value.ExpireAt <= now;
            }
            if (expired)
                _stores.TryRemove(new KeyValuePair<string, HashFieldStore>(kv.Key, kv.Value));
        }
    }

    private HashFieldStore GetOrCreate(string key, TimeSpan ttl)
    {
        while (true)
        {
            var store = _stores.GetOrAdd(key, _ => new HashFieldStore { ExpireAt = DateTime.UtcNow + ttl });
            lock (store.SyncRoot)
            {
                if (store.ExpireAt > DateTime.UtcNow)
                {
                    // 与 RedisHashMapService 的 ExpireWhen.HasNoExpiry 对齐：只在首次创建时设置 TTL，
                    // 已存在的 key 在后续字段写入时不再续租，避免热写入 key 永远不过期。
                    return store;
                }

                _stores.TryRemove(new KeyValuePair<string, HashFieldStore>(key, store));
            }
        }
    }

    private bool TryGetLive(string key, out HashFieldStore store)
    {
        if (!_stores.TryGetValue(key, out store!))
            return false;

        lock (store.SyncRoot)
        {
            if (store.ExpireAt > DateTime.UtcNow)
                return true;

            _stores.TryRemove(new KeyValuePair<string, HashFieldStore>(key, store));
            return false;
        }
    }

    private static string Serialize<T>(T value)
    {
        var tag = typeof(T).FullName ?? typeof(T).Name;
        var json = value is null ? string.Empty : JsonConvert.SerializeObject(value, JsonSettings);
        return $"{tag}{TypeTagSeparator}{json}";
    }

    private T? Deserialize<T>(string key, string field, string? raw)
    {
        if (string.IsNullOrEmpty(raw))
            return default;

        var sepIndex = raw.IndexOf(TypeTagSeparator);
        if (sepIndex < 0)
        {
            return TryDeserializeWithoutTag<T>(key, field, raw);
        }

        var storedTag = raw[..sepIndex];
        var json = raw[(sepIndex + 1)..];
        var requestedTag = typeof(T).FullName ?? typeof(T).Name;

        if (!IsTypeCompatible(storedTag, requestedTag))
            throw new CacheTypeMismatchException(key, field, storedTag, requestedTag);

        if (string.IsNullOrEmpty(json))
            return default;

        if (typeof(T) == typeof(string))
            return (T)(object)json;

        try
        {
            return JsonConvert.DeserializeObject<T>(json, JsonSettings);
        }
        catch (JsonException ex)
        {
            CacheMetrics.DeserializationErrors.Add(1, CacheMetrics.Provider("Memory"), CacheMetrics.Op("hash.get"));
            _logger.LogWarning(ex,
                "MemoryHashMapService deserialize failed. Key={Key}, Field={Field}, Stored={Stored}, Requested={Requested}",
                key, field, storedTag, requestedTag);
            return default;
        }
    }

    private static bool IsTypeCompatible(string stored, string requested)
    {
        if (string.Equals(stored, requested, StringComparison.Ordinal))
            return true;

        // 数值类型相互放宽（int -> long / double 等），这段旁路与 RedisHashMapService 行为对齐；
        // 真要严格类型校验请将存写类型与读类型保持一致。
        return stored is "System.Int32" or "System.Int64" or "System.Double" or "System.Single" or "System.Decimal"
            && requested is "System.Int32" or "System.Int64" or "System.Double" or "System.Single" or "System.Decimal";
    }

    private T? TryDeserializeWithoutTag<T>(string key, string field, string raw)
    {
        if (typeof(T) == typeof(string))
            return (T)(object)raw;

        try
        {
            return JsonConvert.DeserializeObject<T>(raw, JsonSettings);
        }
        catch (JsonException ex)
        {
            CacheMetrics.DeserializationErrors.Add(1, CacheMetrics.Provider("Memory"), CacheMetrics.Op("hash.get"));
            _logger.LogWarning(ex,
                "MemoryHashMapService legacy deserialize failed. Key={Key}, Field={Field}",
                key, field);
            return default;
        }
    }

    private static long ExtractLong(string? packed)
    {
        if (string.IsNullOrEmpty(packed))
            return 0L;

        var sep = packed.IndexOf(TypeTagSeparator);
        var body = sep < 0 ? packed : packed[(sep + 1)..];
        return long.TryParse(body, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : 0L;
    }

    /// <summary>带容量策略的字段存储。</summary>
    private sealed class HashFieldStore
    {
        public readonly object SyncRoot = new();

        public DateTime ExpireAt { get; set; } = DateTime.MaxValue;

        private readonly Dictionary<string, LinkedListNode<string>> _index = new(StringComparer.Ordinal);
        private readonly Dictionary<string, string> _values = new(StringComparer.Ordinal);
        private readonly LinkedList<string> _order = new();

        public void Set(string cacheKey, string field, string value, int maxFields, OverflowPolicy policy)
        {
            if (_index.TryGetValue(field, out var node))
            {
                _values[field] = value;
                _order.Remove(node);
                _order.AddLast(node);
                return;
            }

            if (maxFields > 0 && _order.Count >= maxFields)
            {
                if (policy == OverflowPolicy.Throw)
                    throw new CacheCapacityExceededException(cacheKey, maxFields);

                var oldest = _order.First;
                if (oldest is not null)
                {
                    _order.RemoveFirst();
                    _index.Remove(oldest.Value);
                    _values.Remove(oldest.Value);
                    CacheMetrics.EvictedOverflow.Add(1, CacheMetrics.Provider("Memory"), CacheMetrics.Op("hash"));
                }
            }

            var newNode = _order.AddLast(field);
            _index[field] = newNode;
            _values[field] = value;
        }

        public string? TryGet(string field)
            => _values.TryGetValue(field, out var v) ? v : null;

        public bool Contains(string field) => _values.ContainsKey(field);

        public void Remove(string field)
        {
            if (_index.TryGetValue(field, out var node))
            {
                _order.Remove(node);
                _index.Remove(field);
                _values.Remove(field);
            }
        }

        public Dictionary<string, string> Snapshot()
            => new(_values, StringComparer.Ordinal);
    }
}
