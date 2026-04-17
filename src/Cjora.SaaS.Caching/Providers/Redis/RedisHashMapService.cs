using System.Globalization;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>
/// 基于 Redis HASH 命令集的 HashMap 实现。
/// </summary>
/// <remarks>
/// <para><b>TTL 语义对齐 Memory：</b>仅当 Key 没有 TTL（<c>PTTL == -1</c>）时才设置过期，
/// 后续字段写入不再续租（否则热写入 key 将永远不过期，与 Memory 实现行为相反）。</para>
/// <para><b>类型安全：</b>与 <see cref="MemoryHashMapService"/> 使用同一 <c>{TypeAQN}\u0001{json}</c>
/// 类型标签编码，跨实现读写兼容，并在类型不匹配时抛 <see cref="CacheTypeMismatchException"/>。</para>
/// <para><b>反序列化自愈：</b>单字段反序列化失败不再致 <c>GetAllAsync</c> 整体失败；
/// 记录 <c>cjora.cache.deserialization_errors</c>、删除该字段并置为 <c>default</c>。</para>
/// </remarks>
public sealed class RedisHashMapService : IHashMapService
{
    private const char TypeTagSeparator = '\u0001';
    private const string LongTypeTag = "System.Int64";

    private static readonly JsonSerializerSettings JsonSettings = new() { NullValueHandling = NullValueHandling.Ignore };

    private readonly IConnectionMultiplexer _mux;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;
    private readonly ILogger<RedisHashMapService> _logger;

    /// <summary>DI 构造。</summary>
    public RedisHashMapService(
        IConnectionMultiplexer mux,
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<RedisHashMapService> logger)
    {
        _mux = mux;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    private IDatabase Db => _mux.GetDatabase(Options.Redis.Database);

    /// <inheritdoc />
    public async Task SetFieldAsync<T>(string key, string field, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await Db.HashSetAsync(key, field, Serialize(value)).ConfigureAwait(false);
        await ApplyExpireIfMissingAsync(key, expire).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task SetFieldsAsync<T>(string key, IEnumerable<KeyValuePair<string, T>> fields, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var entries = fields
            .Select(kv => new HashEntry(kv.Key, Serialize(kv.Value)))
            .ToArray();

        if (entries.Length == 0)
            return;

        await Db.HashSetAsync(key, entries).ConfigureAwait(false);
        await ApplyExpireIfMissingAsync(key, expire).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<T?> GetFieldAsync<T>(string key, string field, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var raw = await Db.HashGetAsync(key, field).ConfigureAwait(false);
        if (raw.IsNullOrEmpty)
            return default;

        return Deserialize<T>(key, field, raw!, selfHealField: true);
    }

    /// <inheritdoc />
    public async Task<Dictionary<string, T?>> GetAllAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var entries = await Db.HashGetAllAsync(key).ConfigureAwait(false);
        var result = new Dictionary<string, T?>(entries.Length, StringComparer.Ordinal);

        foreach (var entry in entries)
        {
            var name = entry.Name.ToString();
            if (entry.Value.IsNullOrEmpty)
            {
                result[name] = default;
                continue;
            }

            // 单字段反序列化失败不再让 GetAllAsync 整体抛出，但记录并自愈该字段。
            result[name] = Deserialize<T>(key, name, entry.Value!, selfHealField: true);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task RemoveFieldsAsync(string key, IEnumerable<string> fields, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var hashFields = fields.Select(f => (RedisValue)f).ToArray();
        if (hashFields.Length == 0)
            return;
        await Db.HashDeleteAsync(key, hashFields).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<bool> FieldExistsAsync(string key, string field, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return await Db.HashExistsAsync(key, field).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<long> IncrementAsync(string key, string field, long value = 1, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // 读 - 计算 - 写 用 Lua 保持原子；同时保持 {TypeAQN}\u0001{number} 编码，与 Memory 实现兼容。
        // KEYS[1]=key, ARGV[1]=field, ARGV[2]=delta, ARGV[3]=typeTag
        // Redis Lua (5.1) 不支持 '\u0001' 转义，必须用 string.char(1)。
        const string script = @"
local sep = string.char(1)
local cur = redis.call('HGET', KEYS[1], ARGV[1])
local n = 0
if cur then
    local idx = string.find(cur, sep, 1, true)
    local body = idx and string.sub(cur, idx + 1) or cur
    n = tonumber(body) or 0
end
local nx = n + tonumber(ARGV[2])
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3] .. sep .. tostring(nx))
return tostring(nx)
";

        var result = await Db.ScriptEvaluateAsync(
            script,
            new RedisKey[] { key },
            new RedisValue[] { field, value, LongTypeTag }).ConfigureAwait(false);

        var str = result.ToString();
        if (!long.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var next))
            throw new InvalidOperationException($"Unexpected IncrementAsync result from Lua: {str}");

        await ApplyExpireIfMissingAsync(key, expire: null).ConfigureAwait(false);
        return next;
    }

    /// <inheritdoc />
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await Db.KeyDeleteAsync(key).ConfigureAwait(false);
    }

    private async Task ApplyExpireIfMissingAsync(string key, TimeSpan? expire)
    {
        var ttl = expire ?? CacheOptions.ClampTtl(TimeSpan.FromMinutes(Options.DefaultExpireMinutes));

        // 只在 key 当前无过期时间时才设置 TTL，避免每次写入无限延长寿命。
        // StackExchange.Redis 2.6+ 原生支持 ExpireWhen.HasNoExpiry。
        await Db.KeyExpireAsync(key, ttl, ExpireWhen.HasNoExpiry).ConfigureAwait(false);
    }

    private static string Serialize<T>(T value)
    {
        var tag = typeof(T).FullName ?? typeof(T).Name;
        var json = value is null ? string.Empty : JsonConvert.SerializeObject(value, JsonSettings);
        return $"{tag}{TypeTagSeparator}{json}";
    }

    private T? Deserialize<T>(string key, string field, string raw, bool selfHealField)
    {
        if (string.IsNullOrEmpty(raw))
            return default;

        var sepIndex = raw.IndexOf(TypeTagSeparator);
        if (sepIndex < 0)
        {
            // 兼容旧数据（未带类型标签）。
            return TryDeserializeWithoutTag<T>(key, field, raw, selfHealField);
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
            OnDeserializeFailed(key, field, ex, selfHealField);
            return default;
        }
    }

    private T? TryDeserializeWithoutTag<T>(string key, string field, string raw, bool selfHealField)
    {
        if (typeof(T) == typeof(string))
            return (T)(object)raw;

        try
        {
            return JsonConvert.DeserializeObject<T>(raw, JsonSettings);
        }
        catch (JsonException ex)
        {
            OnDeserializeFailed(key, field, ex, selfHealField);
            return default;
        }
    }

    private void OnDeserializeFailed(string key, string field, JsonException ex, bool selfHeal)
    {
        CacheMetrics.DeserializationErrors.Add(1, CacheMetrics.Provider("Redis"), CacheMetrics.Op("hash.get"));
        _logger.LogWarning(ex,
            "RedisHashMapService deserialize failed. Key={Key}, Field={Field}", key, field);

        if (!selfHeal)
            return;

        try
        {
            // fire-and-forget 删除单字段，避免同一脏数据反复抛异常。
            _ = Db.HashDeleteAsync(key, field);
        }
        catch
        {
            // 自愈失败不向外抛。
        }
    }

    private static bool IsTypeCompatible(string stored, string requested)
    {
        if (string.Equals(stored, requested, StringComparison.Ordinal))
            return true;

        return stored is "System.Int32" or "System.Int64" or "System.Double" or "System.Single" or "System.Decimal"
            && requested is "System.Int32" or "System.Int64" or "System.Double" or "System.Single" or "System.Decimal";
    }
}
