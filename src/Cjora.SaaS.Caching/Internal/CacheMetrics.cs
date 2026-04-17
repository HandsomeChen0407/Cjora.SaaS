using System.Diagnostics.Metrics;

namespace Cjora.SaaS.Caching.Internal;

/// <summary>
/// 缓存模块可观测性指标（<see cref="System.Diagnostics.Metrics.Meter"/>）。
/// 业务侧通过 OpenTelemetry 订阅 Meter 名 <see cref="MeterName"/> 获取。
/// </summary>
/// <remarks>
/// 所有指标均为进程级 Singleton，调用成本 ≈ atomic add，可安全地放到 hot path。
/// </remarks>
internal static class CacheMetrics
{
    /// <summary>Meter 名，稳定不可变。</summary>
    public const string MeterName = "Cjora.SaaS.Caching";

    /// <summary>版本号，语义化遵守 <c>{major}.{minor}.{patch}</c>，结构破坏性变更才 bump major。</summary>
    public const string MeterVersion = "1.0.0";

    private static readonly Meter Meter = new(MeterName, MeterVersion);

    /// <summary>缓存命中次数（按 provider / op 维度）。</summary>
    public static readonly Counter<long> Hits = Meter.CreateCounter<long>(
        "cjora.cache.hits", unit: "{hit}", description: "Cache read hits.");

    /// <summary>缓存未命中次数。</summary>
    public static readonly Counter<long> Misses = Meter.CreateCounter<long>(
        "cjora.cache.misses", unit: "{miss}", description: "Cache read misses.");

    /// <summary>反序列化失败次数（通常意味着脏数据已自愈删除）。</summary>
    public static readonly Counter<long> DeserializationErrors = Meter.CreateCounter<long>(
        "cjora.cache.deserialization_errors", unit: "{error}",
        description: "Cache value deserialization errors (auto-healed by deleting the key).");

    /// <summary>失效广播发布失败次数。</summary>
    public static readonly Counter<long> InvalidationPublishFailures = Meter.CreateCounter<long>(
        "cjora.cache.invalidation_publish_failures", unit: "{failure}",
        description: "ICacheInvalidationBus publish failures.");

    /// <summary>失效广播订阅回调异常次数。</summary>
    public static readonly Counter<long> InvalidationHandlerErrors = Meter.CreateCounter<long>(
        "cjora.cache.invalidation_handler_errors", unit: "{error}",
        description: "ICacheInvalidationBus subscriber handler exceptions.");

    /// <summary>分布式锁获取成功次数。</summary>
    public static readonly Counter<long> LocksAcquired = Meter.CreateCounter<long>(
        "cjora.cache.locks_acquired", unit: "{lock}", description: "Locks successfully acquired.");

    /// <summary>分布式锁获取失败次数（竞争失败）。</summary>
    public static readonly Counter<long> LocksContended = Meter.CreateCounter<long>(
        "cjora.cache.locks_contended", unit: "{lock}", description: "Lock acquisitions rejected because another holder exists.");

    /// <summary>分布式锁续租失败（或锁已丢）次数。</summary>
    public static readonly Counter<long> LocksLost = Meter.CreateCounter<long>(
        "cjora.cache.locks_lost", unit: "{lock}", description: "Lock renewal detected ownership loss.");

    /// <summary>容量溢出被淘汰的字段 / 成员次数。</summary>
    public static readonly Counter<long> EvictedOverflow = Meter.CreateCounter<long>(
        "cjora.cache.evicted_overflow", unit: "{entry}",
        description: "Members/fields evicted due to OverflowPolicy.EvictOldest.");

    public static KeyValuePair<string, object?> Provider(string provider)
        => new("cjora.cache.provider", provider);

    public static KeyValuePair<string, object?> Op(string op)
        => new("cjora.cache.op", op);
}
