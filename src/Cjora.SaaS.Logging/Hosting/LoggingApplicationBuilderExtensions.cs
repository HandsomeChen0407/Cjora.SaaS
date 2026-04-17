using System.Diagnostics;
using Cjora.SaaS.Logging.Middleware;
using Cjora.SaaS.Logging.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Events;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>HTTP 管道扩展：按规范组合 Serilog + 异常兜底 + LogContext + 指标中间件。</summary>
public static class LoggingApplicationBuilderExtensions
{
    /// <summary>
    /// 在管道中挂载：
    /// <list type="number">
    ///   <item><c>UseSerilogRequestLogging</c>（最外层，唯一的请求/异常日志发射点）；</item>
    ///   <item><see cref="CjoraExceptionHandlingMiddleware"/>（统一 JSON 错误响应 + X-Trace-Id）；</item>
    ///   <item><see cref="CjoraHttpMetricsMiddleware"/>（请求数 / 错误数 / 耗时）。</item>
    /// </list>
    /// <para>
    /// 应置于管道靠前位置（在 <c>UseRequestTimeouts</c> 之后、<c>UseAuthentication</c> 之前）。
    /// 配合 <see cref="UseCjoraLogContext"/> 在 Auth / TenantResolution 之后再压入上下文字段。
    /// </para>
    /// </summary>
    public static IApplicationBuilder UseCjoraRequestLogging(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var options = app.ApplicationServices.GetRequiredService<IOptions<RequestLoggingOptions>>().Value;

        app.UseSerilogRequestLogging(o =>
        {
            o.MessageTemplate =
                "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0} ms";

            o.GetLevel = (httpContext, elapsed, ex) =>
            {
                var path = httpContext.Request.Path.Value ?? "/";
                if (options.ExcludePaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
                {
                    return LogEventLevel.Verbose;
                }

                if (ex is not null || httpContext.Response.StatusCode >= 500)
                {
                    return LogEventLevel.Error;
                }

                if (httpContext.Response.StatusCode >= 400)
                {
                    return LogEventLevel.Warning;
                }

                return LogEventLevel.Information;
            };

            o.EnrichDiagnosticContext = (diag, ctx) =>
            {
                var traceId = Activity.Current?.TraceId.ToString()
                              ?? ctx.Items["TraceId"] as string
                              ?? ctx.TraceIdentifier;
                diag.Set("TraceId", traceId);
                diag.Set("ServiceName", options.ServiceName);
                diag.Set("InstanceId", options.InstanceId);

                var endpoint = Microsoft.AspNetCore.Http.EndpointHttpContextExtensions.GetEndpoint(ctx);
                if (endpoint is Microsoft.AspNetCore.Routing.RouteEndpoint re)
                {
                    diag.Set("Route", re.RoutePattern.RawText);
                }
            };
        });

        app.UseMiddleware<CjoraExceptionHandlingMiddleware>();
        app.UseMiddleware<CjoraHttpMetricsMiddleware>();

        return app;
    }

    /// <summary>
    /// 将 <c>TraceId / TenantId / UserId / ServiceName</c> 压入 Serilog <c>LogContext</c>，
    /// 并在请求结束时把所有 <c>IRequestLogEnricher</c> 产出的字段合并到请求完成日志。
    /// <para>
    /// 管道位置：**必须**在 <c>UseAuthentication</c> 与 <c>UseTenantResolution</c> 之后。
    /// </para>
    /// </summary>
    public static IApplicationBuilder UseCjoraLogContext(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<CjoraLogContextMiddleware>();
    }
}
