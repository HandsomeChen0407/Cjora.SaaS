using System.Diagnostics;
using Cjora.SaaS.Logging.Diagnostics;
using Cjora.SaaS.Logging.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Logging.Middleware;

/// <summary>
/// 统一 HTTP 请求指标中间件：发布 <see cref="HttpRequestMetrics"/> 定义的三组遥测值。
/// </summary>
/// <remarks>
/// Tag 固定为 <c>method / status_class / route</c>（route 为路由模板）；
/// 严禁把 <c>TenantId / UserId / TraceId / 查询串</c> 等高基数字段上 Tag。
/// </remarks>
public sealed class CjoraHttpMetricsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HttpRequestMetrics _metrics;
    private readonly RequestLoggingOptions _options;

    public CjoraHttpMetricsMiddleware(
        RequestDelegate next,
        HttpRequestMetrics metrics,
        IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _metrics = metrics;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "/";
        if (_options.ExcludePaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        var sw = Stopwatch.StartNew();
        var threw = false;
        try
        {
            await _next(context).ConfigureAwait(false);
        }
        catch
        {
            threw = true;
            throw;
        }
        finally
        {
            sw.Stop();

            var statusCode = threw ? StatusCodes.Status500InternalServerError : context.Response.StatusCode;
            var statusClass = HttpRequestMetrics.StatusClass(statusCode);
            var route = context.GetEndpoint() is RouteEndpoint re
                ? re.RoutePattern.RawText ?? path
                : "unmatched";

            var tags = new TagList
            {
                { "method", context.Request.Method },
                { "status_class", statusClass },
                { "route", route }
            };

            _metrics.Requests.Add(1, tags);
            _metrics.Duration.Record(sw.Elapsed.TotalMilliseconds, tags);
            if (statusClass == "5xx" || threw)
            {
                _metrics.Errors.Add(1, tags);
            }
        }
    }
}
