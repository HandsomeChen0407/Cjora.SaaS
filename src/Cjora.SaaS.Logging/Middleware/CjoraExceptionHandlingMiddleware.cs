using System.Diagnostics;
using Cjora.SaaS.Logging.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Logging.Middleware;

/// <summary>
/// 未处理异常统一 JSON 响应 + <c>X-Trace-Id</c> 响应头写入中间件。
/// </summary>
/// <remarks>
/// <para>
/// 本中间件**不记录日志**：异常的唯一日志入口由外层 <c>UseSerilogRequestLogging</c> 负责，
/// 以确保“异常只允许统一记录一次”的规范得以遵守（Serilog 会在捕获异常后以 Error 级别
/// 发出单条结构化请求日志，含完整堆栈）。
/// </para>
/// <para>
/// 管道位置：**必须**放在 <c>UseSerilogRequestLogging</c> 的内层、Auth/TenantResolution 的外层。
/// 这样异常会先被 Serilog 观测并记录，再由本中间件兜底写出 JSON 响应。
/// </para>
/// </remarks>
public sealed class CjoraExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly RequestLoggingOptions _options;

    public CjoraExceptionHandlingMiddleware(RequestDelegate next, IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
        context.Items["TraceId"] = traceId;
        context.Response.Headers[_options.TraceIdHeader] = traceId;

        try
        {
            await _next(context).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.Headers[_options.TraceIdHeader] = traceId;

            var message = _options.IncludeExceptionDetail ? ex.Message : "Internal Server Error";
            await context.Response
                .WriteAsJsonAsync(new { success = false, error = "unhandled", traceId, message }, context.RequestAborted)
                .ConfigureAwait(false);

            // 让外层 Serilog 请求日志管道观测到本次异常（唯一日志入口）
            throw;
        }
    }
}
