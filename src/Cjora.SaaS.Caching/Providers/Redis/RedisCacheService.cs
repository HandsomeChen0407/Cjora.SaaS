using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis STRING 命令的缓存实现，值以 JSON 序列化存储。</summary>
/// <remarks>
/// <para><b>反序列化自愈：</b><see cref="GetAsync{T}"/> 遇到脏数据（JsonException）时会记录日志、
/// 打点 <c>cjora.cache.deserialization_errors</c>、<c>DEL</c> 该 key 并返回 <c>default</c>，
/// 避免"同一坏值每次读都抛异常"。</para>
/// </remarks>
public sealed class RedisCacheService : ICachingService
{
    private static readonly JsonSerializerSettings JsonSettings = new() { NullValueHandling = NullValueHandling.Ignore };

    private readonly IConnectionMultiplexer _mux;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;
    private readonly ILogger<RedisCacheService> _logger;

    private const string ProviderName = "Redis";

    /// <summary>DI 构造。</summary>
    public RedisCacheService(
        IConnectionMultiplexer mux,
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<RedisCacheService> logger)
    {
        _mux = mux;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    private IDatabase Db => _mux.GetDatabase(Options.Redis.Database);

    /// <inheritdoc />
    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return default;

        var raw = await Db.StringGetAsync(key).ConfigureAwait(false);
        if (raw.IsNullOrEmpty)
        {
            CacheMetrics.Misses.Add(1, CacheMetrics.Provider(ProviderName), CacheMetrics.Op("get"));
            return default;
        }

        try
        {
            var val = JsonConvert.DeserializeObject<T>(raw!, JsonSettings);
            CacheMetrics.Hits.Add(1, CacheMetrics.Provider(ProviderName), CacheMetrics.Op("get"));
            return val;
        }
        catch (JsonException ex)
        {
            CacheMetrics.DeserializationErrors.Add(1, CacheMetrics.Provider(ProviderName), CacheMetrics.Op("get"));
            _logger.LogWarning(ex,
                "RedisCacheService GetAsync<{Type}> deserialization failed; auto-healing by deleting Key={Key}.",
                typeof(T).FullName, key);
            try
            {
                await Db.KeyDeleteAsync(key).ConfigureAwait(false);
            }
            catch (Exception delEx)
            {
                _logger.LogWarning(delEx, "Auto-heal delete failed. Key={Key}", key);
            }
            return default;
        }
    }

    /// <inheritdoc />
    public async Task SetAsync<T>(string key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return;

        var ttl = expire ?? DefaultTtl();
        var raw = JsonConvert.SerializeObject(value, JsonSettings);
        await Db.StringSetAsync(key, raw, ttl).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return;

        await Db.KeyDeleteAsync(key).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<bool> SetIfAbsentAsync<T>(string key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return false;

        var ttl = expire ?? DefaultTtl();
        var raw = JsonConvert.SerializeObject(value, JsonSettings);
        return await Db.StringSetAsync(key, raw, ttl, when: When.NotExists).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<TimeSpan?> GetTtlAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return null;

        return await Db.KeyTimeToLiveAsync(key).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<TtlResult> GetTtlResultAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return TtlResult.KeyNotExists;

        if (!await Db.KeyExistsAsync(key).ConfigureAwait(false))
            return TtlResult.KeyNotExists;

        var ttl = await Db.KeyTimeToLiveAsync(key).ConfigureAwait(false);
        return ttl is null ? TtlResult.NoExpiry : TtlResult.FromValue(ttl.Value);
    }

    /// <inheritdoc />
    public async Task<bool> KeyExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return false;

        return await Db.KeyExistsAsync(key).ConfigureAwait(false);
    }

    private TimeSpan DefaultTtl() => CacheOptions.ClampTtl(TimeSpan.FromMinutes(Options.DefaultExpireMinutes));
}
