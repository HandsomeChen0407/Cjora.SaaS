using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis GEOADD / GEORADIUS 命令的 Geo 实现。</summary>
/// <remarks>
/// TTL 仅在 Key 当前没有 TTL 时设置（<see cref="ExpireWhen.HasNoExpiry"/>），避免热写入 key 永远不过期。
/// </remarks>
public sealed class RedisGeoService : IGeoService
{
    private readonly IConnectionMultiplexer _mux;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;

    /// <summary>DI 构造。</summary>
    public RedisGeoService(IConnectionMultiplexer mux, IOptionsMonitor<CacheOptions> optionsMonitor)
    {
        _mux = mux;
        _optionsMonitor = optionsMonitor;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    private IDatabase Db => _mux.GetDatabase(Options.Redis.Database);

    /// <inheritdoc />
    public async Task AddOrUpdateAsync(string key, string member, double longitude, double latitude, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await Db.GeoAddAsync(key, longitude, latitude, member).ConfigureAwait(false);
        var ttl = expire ?? CacheOptions.ClampTtl(TimeSpan.FromMinutes(Options.DefaultExpireMinutes));
        await Db.KeyExpireAsync(key, ttl, ExpireWhen.HasNoExpiry).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<GeoSearchResult>> RadiusSearchAsync(
        string key, double longitude, double latitude,
        double radiusMeters, int count = 50,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var results = await Db.GeoRadiusAsync(
                key, longitude, latitude, radiusMeters, GeoUnit.Meters,
                count: count, order: Order.Ascending, options: GeoRadiusOptions.WithDistance)
            .ConfigureAwait(false);

        return results
            .Select(r => new GeoSearchResult(r.Member.ToString(), r.Distance))
            .ToArray();
    }
}
