using System.Collections.Concurrent;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于自维护 <see cref="ConcurrentDictionary{TKey,TValue}"/> + Haversine 公式的单机 Geo 实现。</summary>
/// <remarks>
/// <para><b>并发正确性：</b>每个 Key 对应一个 <see cref="GeoMemberMap"/>，使用 <see cref="ConcurrentDictionary{TKey,TValue}.GetOrAdd(TKey,Func{TKey,TValue})"/>
/// 保证同一进程内<b>至多只有一个</b> container 实例（即便工厂被并发调用，只有一次结果被保留），根除了
/// 原 <c>IMemoryCache.GetOrCreate</c> "多个 first-writer 各造一个 map，后写覆盖前写丢成员" 的致命 bug。</para>
/// <para><b>TTL：</b>每次 AddOrUpdate 记录 ExpireAt；读取时检查是否过期，过期则移除（懒过期）。没有后台扫描线程。</para>
/// <para>单 Key 成员数上限由 <see cref="MemoryCacheLimitsOptions.GeoMaxMembersPerKey"/> 控制，
/// 超限行为由 <see cref="MemoryCacheLimitsOptions.OverflowPolicy"/> 决定：</para>
/// <list type="bullet">
///   <item><description><c>Throw</c>（默认）：抛 <see cref="CacheCapacityExceededException"/>，避免静默丢数据；</description></item>
///   <item><description><c>EvictOldest</c>：按 FIFO 淘汰最早写入的成员，淘汰次数会打点 <c>cjora.cache.evicted_overflow</c>。</description></item>
/// </list>
/// </remarks>
public sealed class MemoryGeoService : IGeoService
{
    private readonly ConcurrentDictionary<string, GeoMemberMap> _maps = new(StringComparer.Ordinal);
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;

    /// <summary>DI 构造。</summary>
    public MemoryGeoService(IOptionsMonitor<CacheOptions> optionsMonitor)
    {
        _optionsMonitor = optionsMonitor;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    /// <inheritdoc />
    public Task AddOrUpdateAsync(string key, string member, double longitude, double latitude, TimeSpan? expire = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return Task.CompletedTask;

        var opts = Options;
        var ttl = expire ?? CacheOptions.ClampTtl(TimeSpan.FromMinutes(opts.DefaultExpireMinutes));
        var map = GetOrCreate(key, ttl);

        lock (map.SyncRoot)
        {
            map.ExpireAt = DateTime.UtcNow + ttl;
            map.AddOrUpdate(
                key,
                member,
                longitude,
                latitude,
                opts.Memory.GeoMaxMembersPerKey,
                opts.Memory.OverflowPolicy);
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<GeoSearchResult>> RadiusSearchAsync(
        string key, double longitude, double latitude,
        double radiusMeters, int count = 50,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key) || !_maps.TryGetValue(key, out var map))
            return Task.FromResult<IReadOnlyList<GeoSearchResult>>(Array.Empty<GeoSearchResult>());

        KeyValuePair<string, (double Lon, double Lat)>[] snapshot;
        lock (map.SyncRoot)
        {
            if (map.ExpireAt <= DateTime.UtcNow)
            {
                // 懒过期：发现到期则移除整个 map。
                _maps.TryRemove(new KeyValuePair<string, GeoMemberMap>(key, map));
                return Task.FromResult<IReadOnlyList<GeoSearchResult>>(Array.Empty<GeoSearchResult>());
            }
            snapshot = map.Snapshot();
        }

        var list = snapshot
            .Select(kv => new GeoSearchResult(kv.Key, HaversineMeters(latitude, longitude, kv.Value.Lat, kv.Value.Lon)))
            .Where(x => x.DistanceMeters is not null && x.DistanceMeters <= radiusMeters)
            .OrderBy(x => x.DistanceMeters)
            .Take(count)
            .ToArray();

        return Task.FromResult<IReadOnlyList<GeoSearchResult>>(list);
    }

    private GeoMemberMap GetOrCreate(string key, TimeSpan ttl)
    {
        while (true)
        {
            var map = _maps.GetOrAdd(key, _ => new GeoMemberMap { ExpireAt = DateTime.UtcNow + ttl });
            lock (map.SyncRoot)
            {
                if (map.ExpireAt > DateTime.UtcNow)
                    return map;

                // 命中过期残留，移除后下轮循环重建。
                _maps.TryRemove(new KeyValuePair<string, GeoMemberMap>(key, map));
            }
        }
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

    /// <summary>带容量策略的 Geo 成员集合。</summary>
    private sealed class GeoMemberMap
    {
        public readonly object SyncRoot = new();

        public DateTime ExpireAt { get; set; } = DateTime.MaxValue;

        private readonly Dictionary<string, LinkedListNode<string>> _index =
            new(StringComparer.Ordinal);

        private readonly Dictionary<string, (double Lon, double Lat)> _coords =
            new(StringComparer.Ordinal);

        private readonly LinkedList<string> _order = new();

        public void AddOrUpdate(string key, string member, double lon, double lat, int maxMembers, OverflowPolicy policy)
        {
            if (_index.TryGetValue(member, out var node))
            {
                _coords[member] = (lon, lat);
                _order.Remove(node);
                _order.AddLast(node);
                return;
            }

            if (maxMembers > 0 && _order.Count >= maxMembers)
            {
                if (policy == OverflowPolicy.Throw)
                    throw new CacheCapacityExceededException(key, maxMembers);

                var oldest = _order.First;
                if (oldest is not null)
                {
                    _order.RemoveFirst();
                    _index.Remove(oldest.Value);
                    _coords.Remove(oldest.Value);
                    CacheMetrics.EvictedOverflow.Add(1, CacheMetrics.Provider("Memory"), CacheMetrics.Op("geo"));
                }
            }

            var newNode = _order.AddLast(member);
            _index[member] = newNode;
            _coords[member] = (lon, lat);
        }

        public KeyValuePair<string, (double Lon, double Lat)>[] Snapshot()
            => _coords.ToArray();
    }
}
