using System.Diagnostics;
using Cjora.SaaS.Logging.Abstractions;
using Cjora.SaaS.Logging.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Logging.Middleware;

/// <summary>
/// 请求日志 + 未处理异常响应中间件。
/// 每个请求完成后输出一条结构化日志（TraceId / Path / StatusCode / ElapsedMs），
/// 并调用所有注册的 <see cref="IRequestLogEnricher"/> 追加领域字段。
/// 未处理异常时返回统一 JSON 错误响应，响应头写入 <c>X-Trace-Id</c>。
/// </summary>
public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly RequestLoggingOptions _options;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger,
        IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _logger = logger;
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

        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        context.Items["TraceId"] = traceId;
        context.Response.Headers.TryAdd("X-Trace-Id", traceId);

        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context).ConfigureAwait(false);
            sw.Stop();
            EmitLog(context, traceId, sw.ElapsedMilliseconds, exception: null);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            sw.Stop();
            _logger.LogWarning("Request cancelled. TraceId={TraceId}, Path={Path}, ElapsedMs={ElapsedMs}",
                traceId, path, sw.ElapsedMilliseconds);
            throw;
        }
        catch (Exception ex)
        {
            sw.Stop();
            EmitLog(context, traceId, sw.ElapsedMilliseconds, ex);

            if (context.Response.HasStarted)
                throw;

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json; charset=utf-8";

            var message = _options.IncludeExceptionDetail ? ex.Message : "Internal Server Error";
            await context.Response.WriteAsJsonAsync(new { success = false, error = "unhandled", traceId, message },
                context.RequestAborted).ConfigureAwait(false);
        }
    }

    private void EmitLog(HttpContext context, string traceId, long elapsedMs, Exception? exception)
    {
        var props = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["TraceId"] = traceId,
            ["Method"] = context.Request.Method,
            ["Path"] = context.Request.Path.Value,
            ["StatusCode"] = context.Response.StatusCode,
            ["ElapsedMs"] = elapsedMs,
            ["UserId"] = context.User?.FindFirst("user_id")?.Value,
            ["TenantId"] = context.Request.Headers["X-Tenant-Id"].FirstOrDefault()
        };

        var enrichers = context.RequestServices.GetServices<IRequestLogEnricher>();
        foreach (var enricher in enrichers)
        {
            try { enricher.Enrich(context, props); }
            catch { /* enricher failure must not break the pipeline */ }
        }

        if (exception is not null)
        {
            _logger.LogError(exception,
                "Request failed. {@RequestLog}", props);
        }
        else
        {
            _logger.LogInformation("Request completed. {@RequestLog}", props);
        }
    }
}
