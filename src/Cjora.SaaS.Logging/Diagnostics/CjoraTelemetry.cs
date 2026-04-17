using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Cjora.SaaS.Logging.Diagnostics;

/// <summary>
/// Cjora.SaaS 全服务共享的 <see cref="ActivitySource"/> / <see cref="Meter"/> 命名常量。
/// OpenTelemetry 收集链路与指标时按此白名单注册，业务模块需使用 <c>Cjora.*</c> 前缀的名称，
/// 禁止自建 Logger 包装；链路追踪与指标采集全部基于 .NET 原生 API 与 OpenTelemetry SDK。
/// </summary>
public static class CjoraTelemetry
{
    /// <summary>所有 Cjora.* 遥测资源的统一前缀。</summary>
    public const string Namespace = "Cjora";

    /// <summary>HTTP 请求管道使用的 <see cref="ActivitySource"/> 名称。</summary>
    public const string HttpActivitySourceName = "Cjora.SaaS.Http";

    /// <summary>HTTP 请求管道使用的 <see cref="Meter"/> 名称（与 ActivitySource 对齐）。</summary>
    public const string HttpMeterName = "Cjora.SaaS.Http";

    /// <summary>缓存模块 <see cref="Meter"/> / <see cref="ActivitySource"/> 名称（与 <c>Cjora.SaaS.Caching.Internal.CacheMetrics.MeterName</c> 严格对齐）。</summary>
    public const string CachingTelemetryName = "Cjora.SaaS.Caching";

    /// <summary>数据访问（SqlSugar）模块 <see cref="Meter"/> / <see cref="ActivitySource"/> 名称（与 <c>Cjora.SaaS.Core.Diagnostics.DataTelemetry.Name</c> 严格对齐）。</summary>
    public const string DataTelemetryName = "Cjora.SaaS.Data";

    /// <summary>Sys 权限模块 <see cref="Meter"/> / <see cref="ActivitySource"/> 名称（与 <c>Cjora.SaaS.Sys.Diagnostics.AuthTelemetry.Name</c> 严格对齐）。</summary>
    public const string SysAuthTelemetryName = "Cjora.SaaS.Sys.Auth";

    /// <summary>Cjora 默认接入 OTel 的 ActivitySource 名称列表（允许宿主追加自定义值）。</summary>
    public static readonly IReadOnlyList<string> DefaultActivitySources = new[]
    {
        HttpActivitySourceName,
        CachingTelemetryName,
        DataTelemetryName,
        SysAuthTelemetryName,
        // OpenTelemetry.Instrumentation.AspNetCore 自动发布的 ActivitySource
        "Microsoft.AspNetCore",
        // OpenTelemetry.Instrumentation.Http 自动发布的 ActivitySource
        "System.Net.Http",
        // 若宿主追加 OpenTelemetry.Instrumentation.StackExchangeRedis：
        "OpenTelemetry.Instrumentation.StackExchangeRedis"
    };

    /// <summary>Cjora 默认接入 OTel 的 Meter 名称列表。</summary>
    public static readonly IReadOnlyList<string> DefaultMeters = new[]
    {
        HttpMeterName,
        CachingTelemetryName,
        DataTelemetryName,
        SysAuthTelemetryName,
        // 框架内置 HTTP 指标：http.server.request.duration 等
        "Microsoft.AspNetCore.Hosting",
        "Microsoft.AspNetCore.Server.Kestrel",
        "System.Net.Http"
    };

    /// <summary>
    /// Cjora.Http ActivitySource 单例；中间件 / Enricher 需创建自有 <see cref="Activity"/> 时复用此实例。
    /// </summary>
    public static readonly ActivitySource HttpActivitySource = new(HttpActivitySourceName);

    /// <summary>
    /// Cjora.Http Meter 单例；请求数 / 错误数 / 耗时直方图等在此 Meter 上发布。
    /// </summary>
    public static readonly Meter HttpMeter = new(HttpMeterName);
}
