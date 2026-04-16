using Cjora.SaaS.Caching.Models;

namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// Geo 空间数据缓存抽象。Memory 实现使用 Haversine 公式，Redis 实现映射 GEOADD / GEORADIUS。
/// </summary>
public interface IGeoService
{
    /// <summary>添加或更新成员的经纬度。</summary>
    Task AddOrUpdateAsync(string key, string member, double longitude, double latitude, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>按半径搜索附近成员。</summary>
    Task<IReadOnlyList<GeoSearchResult>> RadiusSearchAsync(
        string key,
        double longitude,
        double latitude,
        double radiusMeters,
        int count = 50,
        CancellationToken cancellationToken = default);
}
