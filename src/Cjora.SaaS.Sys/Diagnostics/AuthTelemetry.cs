using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Cjora.SaaS.Sys.Diagnostics;

/// <summary>
/// Sys 模块权限体系（有效权限码 / 行级数据权限）的可观测性定义：
/// <see cref="ActivitySource"/> 与 <see cref="Meter"/> 共用名称 <c>Cjora.SaaS.Sys.Auth</c>，
/// 由宿主通过 <c>CjoraTelemetry.DefaultActivitySources / DefaultMeters</c> 白名单订阅。
/// </summary>
/// <remarks>
/// 指标清单（低基数标签）：
/// <list type="bullet">
///   <item><description><c>cjora.auth.permission.compute.duration</c>（Histogram，<c>ms</c>）— 有效权限码解析耗时；</description></item>
///   <item><description><c>cjora.auth.data_permission.compute.duration</c>（Histogram，<c>ms</c>）— 行级数据权限解析耗时；</description></item>
///   <item><description><c>cjora.auth.cache.hits</c> / <c>cjora.auth.cache.misses</c>（Counter）— 权限缓存命中统计；</description></item>
///   <item><description><c>cjora.auth.compute.errors</c>（Counter）— 权限计算异常累计。</description></item>
/// </list>
/// 标签仅保留：<c>auth.kind</c>（<c>permission</c> / <c>data_permission</c>）、<c>auth.source</c>（<c>cache</c> / <c>fresh</c> / <c>fresh_no_lock</c>）。
/// <b>禁止</b>把 <c>tenantId / userId</c> 作为标签，否则会导致指标基数爆炸。
/// </remarks>
public static class AuthTelemetry
{
    /// <summary>统一 ActivitySource / Meter 名称，与 <c>CjoraTelemetry.SysAuthTelemetryName</c> 保持一致。</summary>
    public const string Name = "Cjora.SaaS.Sys.Auth";

    /// <summary>权限相关 span 起点。</summary>
    public static readonly ActivitySource ActivitySource = new(Name);

    /// <summary>权限相关指标发射器。</summary>
    public static readonly Meter Meter = new(Name);

    /// <summary>有效权限码解析耗时。</summary>
    public static readonly Histogram<double> PermissionComputeDuration = Meter.CreateHistogram<double>(
        name: "cjora.auth.permission.compute.duration",
        unit: "ms",
        description: "有效权限码解析耗时（包含缓存命中路径）。");

    /// <summary>行级数据权限解析耗时。</summary>
    public static readonly Histogram<double> DataPermissionComputeDuration = Meter.CreateHistogram<double>(
        name: "cjora.auth.data_permission.compute.duration",
        unit: "ms",
        description: "行级数据权限解析耗时（包含缓存命中路径）。");

    /// <summary>权限相关缓存命中数。</summary>
    public static readonly Counter<long> CacheHits = Meter.CreateCounter<long>(
        name: "cjora.auth.cache.hits",
        unit: "{request}",
        description: "权限缓存命中累计。");

    /// <summary>权限相关缓存未命中数。</summary>
    public static readonly Counter<long> CacheMisses = Meter.CreateCounter<long>(
        name: "cjora.auth.cache.misses",
        unit: "{request}",
        description: "权限缓存未命中累计（需要重算）。");

    /// <summary>权限计算错误累计。</summary>
    public static readonly Counter<long> ComputeErrors = Meter.CreateCounter<long>(
        name: "cjora.auth.compute.errors",
        unit: "{error}",
        description: "权限计算（命中缓存 / 未命中重算）过程中抛出的异常累计。");

    /// <summary>常见标签键名集中声明，避免拼写漂移。</summary>
    public static class Tags
    {
        /// <summary><c>auth.kind</c>：<c>permission</c> 或 <c>data_permission</c>。</summary>
        public const string Kind = "auth.kind";

        /// <summary><c>auth.source</c>：<c>cache</c> / <c>fresh</c> / <c>fresh_no_lock</c>。</summary>
        public const string Source = "auth.source";
    }
}
