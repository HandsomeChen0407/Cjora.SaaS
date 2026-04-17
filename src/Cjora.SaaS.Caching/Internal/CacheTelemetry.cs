using System.Diagnostics;

namespace Cjora.SaaS.Caching.Internal;

/// <summary>
/// 缓存模块的 <see cref="ActivitySource"/>：用于 <c>cache.get / cache.set / cache.remove / cache.invalidate.publish / cache.invalidate.handle</c>
/// 等 Span 的定义与分发。Meter 由 <see cref="CacheMetrics"/> 单独维护（同名 <c>Cjora.SaaS.Caching</c>）。
/// </summary>
/// <remarks>
/// 名称与 <c>CjoraTelemetry.CachingTelemetryName</c> 严格对齐，便于宿主统一订阅。
/// </remarks>
internal static class CacheTelemetry
{
    /// <summary>ActivitySource 名称。</summary>
    public const string Name = CacheMetrics.MeterName;

    /// <summary>进程级单例 ActivitySource。</summary>
    public static readonly ActivitySource ActivitySource = new(Name);
}
