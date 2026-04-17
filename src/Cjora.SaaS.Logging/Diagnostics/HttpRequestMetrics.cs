using System.Diagnostics.Metrics;

namespace Cjora.SaaS.Logging.Diagnostics;

/// <summary>
/// 应用级 HTTP 请求指标（补充 ASP.NET Core 内置指标，仅记录聚合维度以避免高基数）。
/// <list type="bullet">
///   <item><c>cjora.http.server.requests</c>：请求总数（Counter）。</item>
///   <item><c>cjora.http.server.errors</c>：5xx / 未处理异常计数（Counter）。</item>
///   <item><c>cjora.http.server.duration</c>：请求耗时毫秒直方图（Histogram）。</item>
/// </list>
/// Tag 维度固定为 <c>method / status_class / route</c>；<c>route</c> 为 ASP.NET Core 路由模板
/// （形如 <c>/api/sys/users/{id}</c>），不会含有具体 Id 值；<c>tenant_id / user_id</c> 等高基数字段严禁上 Tag。
/// </summary>
public sealed class HttpRequestMetrics
{
    /// <summary>HTTP 请求计数器（维度：method/status_class/route）。</summary>
    public Counter<long> Requests { get; }

    /// <summary>HTTP 错误计数器（status_class 为 5xx 时递增）。</summary>
    public Counter<long> Errors { get; }

    /// <summary>HTTP 请求耗时直方图（单位：毫秒）。</summary>
    public Histogram<double> Duration { get; }

    public HttpRequestMetrics()
    {
        var meter = CjoraTelemetry.HttpMeter;

        Requests = meter.CreateCounter<long>(
            name: "cjora.http.server.requests",
            unit: "{request}",
            description: "Number of HTTP server requests.");

        Errors = meter.CreateCounter<long>(
            name: "cjora.http.server.errors",
            unit: "{error}",
            description: "Number of failed HTTP server requests (5xx or unhandled exceptions).");

        Duration = meter.CreateHistogram<double>(
            name: "cjora.http.server.duration",
            unit: "ms",
            description: "Duration of HTTP server requests in milliseconds.");
    }

    /// <summary>将 HTTP 状态码规约为 <c>1xx/2xx/3xx/4xx/5xx</c>，降低 Tag 基数。</summary>
    public static string StatusClass(int statusCode) => statusCode switch
    {
        >= 100 and < 200 => "1xx",
        >= 200 and < 300 => "2xx",
        >= 300 and < 400 => "3xx",
        >= 400 and < 500 => "4xx",
        >= 500 and < 600 => "5xx",
        _ => "unknown"
    };
}
