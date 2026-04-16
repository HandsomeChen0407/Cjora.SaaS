using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis GEOADD / GEORADIUS 命令的 Geo 实现。</summary>
public sealed class RedisGeoService : IGeoService
{
    private readonly IConnectionMultiplexer _mux;
    private readonly CacheOptions _options;

    public RedisGeoService(IConnectionMultiplexer mux, IOptions<CacheOptions> options)
    {
        _mux = mux;
        _options = options.Value;
    }

    private IDatabase Db => _mux.GetDatabase(_options.Redis.Database);

    public async Task AddOrUpdateAsync(string key, string member, double longitude, double latitude, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        await Db.GeoAddAsync(key, longitude, latitude, member).ConfigureAwait(false);
        var ttl = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));
        await Db.KeyExpireAsync(key, ttl).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<GeoSearchResult>> RadiusSearchAsync(
        string key, double longitude, double latitude,
        double radiusMeters, int count = 50,
        CancellationToken cancellationToken = default)
    {
        var results = await Db.GeoRadiusAsync(
                key, longitude, latitude, radiusMeters, GeoUnit.Meters,
                count: count, order: Order.Ascending, options: GeoRadiusOptions.WithDistance)
            .ConfigureAwait(false);

        return results
            .Select(r => new GeoSearchResult(r.Member.ToString(), r.Distance))
            .ToArray();
    }
}
