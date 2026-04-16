using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 <see cref="IMemoryCache"/> + Haversine 公式的单机 Geo 实现。</summary>
public sealed class MemoryGeoService : IGeoService
{
    private readonly IMemoryCache _cache;
    private readonly CacheOptions _options;

    public MemoryGeoService(IMemoryCache cache, IOptions<CacheOptions> options)
    {
        _cache = cache;
        _options = options.Value;
    }

    public Task AddOrUpdateAsync(string key, string member, double longitude, double latitude, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        var ttl = expire ?? TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10));

        var map = _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = ttl;
            return new Dictionary<string, (double Lon, double Lat)>(StringComparer.Ordinal);
        })!;

        map[member] = (longitude, latitude);
        _cache.Set(key, map, ttl);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<GeoSearchResult>> RadiusSearchAsync(
        string key, double longitude, double latitude,
        double radiusMeters, int count = 50,
        CancellationToken cancellationToken = default)
    {
        if (!_cache.TryGetValue(key, out Dictionary<string, (double Lon, double Lat)>? map) || map is null)
            return Task.FromResult<IReadOnlyList<GeoSearchResult>>(Array.Empty<GeoSearchResult>());

        var list = map
            .Select(kv => new GeoSearchResult(kv.Key, HaversineMeters(latitude, longitude, kv.Value.Lat, kv.Value.Lon)))
            .Where(x => x.DistanceMeters is not null && x.DistanceMeters <= radiusMeters)
            .OrderBy(x => x.DistanceMeters)
            .Take(count)
            .ToArray();

        return Task.FromResult<IReadOnlyList<GeoSearchResult>>(list);
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6_371_000d;
        static double ToRad(double deg) => deg * Math.PI / 180d;

        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
