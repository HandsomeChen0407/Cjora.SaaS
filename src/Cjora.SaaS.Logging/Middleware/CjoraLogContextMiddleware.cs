using System.Diagnostics;
using Cjora.SaaS.Logging.Abstractions;
using Cjora.SaaS.Logging.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Context;

namespace Cjora.SaaS.Logging.Middleware;

/// <summary>
/// 将 <c>TraceId / TenantId / UserId / ServiceName</c> 压入 Serilog <see cref="LogContext"/>，
/// 使后续所有 <c>ILogger</c> 日志自动携带这些结构化字段；同时在请求结束时把
/// <see cref="IRequestLogEnricher"/> 产出的领域字段写入 <see cref="IDiagnosticContext"/>，
/// 由外层 <c>UseSerilogRequestLogging</c> 合并到完成日志中。
/// </summary>
/// <remarks>
/// 管道位置：**必须**放在 <c>UseSerilogRequestLogging</c> 与 Auth / TenantResolution 之后，
/// 确保 <see cref="HttpContext.User"/> 与 <c>X-Tenant-Id</c> 已就绪。
/// </remarks>
public sealed class CjoraLogContextMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDiagnosticContext _diagnosticContext;
    private readonly RequestLoggingOptions _options;

    public CjoraLogContextMiddleware(
        RequestDelegate next,
        IDiagnosticContext diagnosticContext,
        IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _diagnosticContext = diagnosticContext;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.TraceId.ToString()
                      ?? context.Items["TraceId"] as string
                      ?? context.TraceIdentifier;
        var spanId = Activity.Current?.SpanId.ToString();
        var parentSpanId = Activity.Current?.ParentSpanId.ToString();

        var tenantId = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        var userId = context.User?.FindFirst("user_id")?.Value;
        var module = SafeResolveModule(context);

        using (LogContext.PushProperty("TraceId", traceId))
        using (LogContext.PushProperty("SpanId", spanId))
        using (LogContext.PushProperty("ParentSpanId", parentSpanId))
        using (LogContext.PushProperty("TenantId", tenantId))
        using (LogContext.PushProperty("UserId", userId))
        using (LogContext.PushProperty("ServiceName", _options.ServiceName))
        using (LogContext.PushProperty("InstanceId", _options.InstanceId))
        using (LogContext.PushProperty("Module", module))
        {
            // 对外层 UseSerilogRequestLogging 发出的“完成日志”补充字段
            _diagnosticContext.Set("TraceId", traceId);
            if (spanId is not null) _diagnosticContext.Set("SpanId", spanId);
            if (parentSpanId is not null) _diagnosticContext.Set("ParentSpanId", parentSpanId);
            if (tenantId is not null) _diagnosticContext.Set("TenantId", tenantId);
            if (userId is not null) _diagnosticContext.Set("UserId", userId);
            _diagnosticContext.Set("ServiceName", _options.ServiceName);
            _diagnosticContext.Set("InstanceId", _options.InstanceId);
            if (module is not null) _diagnosticContext.Set("Module", module);

            try
            {
                await _next(context).ConfigureAwait(false);
            }
            finally
            {
                // 领域扩展字段（如 DataScope）仅用于“完成日志”，不写入 LogContext 以避免跨请求污染
                var enrichers = context.RequestServices.GetServices<IRequestLogEnricher>();
                var props = new Dictionary<string, object?>(StringComparer.Ordinal);
                foreach (var enricher in enrichers)
                {
                    try { enricher.Enrich(context, props); }
                    catch { /* enricher failure must not break the pipeline */ }
                }
                foreach (var kvp in props)
                {
                    _diagnosticContext.Set(kvp.Key, kvp.Value);
                }
            }
        }
    }

    private string? SafeResolveModule(HttpContext context)
    {
        try
        {
            return _options.ModuleResolver?.Invoke(context);
        }
        catch
        {
            // 解析器异常不得影响主管道
            return null;
        }
    }
}
