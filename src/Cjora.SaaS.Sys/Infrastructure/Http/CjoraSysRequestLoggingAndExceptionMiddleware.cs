using System.Diagnostics;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cjora.SaaS.Sys.Infrastructure.Http;

/// <summary>
/// 请求结束结构化日志（TraceId、用户、租户、路径、耗时、数据权限、Provider 列表）与未处理异常统一 JSON 响应。
/// </summary>
public sealed class CjoraSysRequestLoggingAndExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CjoraSysRequestLoggingAndExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public CjoraSysRequestLoggingAndExceptionMiddleware(
        RequestDelegate next,
        ILogger<CjoraSysRequestLoggingAndExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString("N");
        context.Items["TraceId"] = traceId;
        context.Response.Headers.TryAdd("X-Trace-Id", traceId);

        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context).ConfigureAwait(false);
            sw.Stop();
            LogRequestCompleted(context, traceId, sw.ElapsedMilliseconds);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            sw.Stop();
            _logger.LogWarning(
                "Request cancelled or timed out. TraceId={TraceId}, Path={Path}, ElapsedMs={ElapsedMs}",
                traceId,
                context.Request.Path.Value,
                sw.ElapsedMilliseconds);
            throw;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(
                ex,
                "Unhandled exception. TraceId={TraceId}, Path={Path}, ElapsedMs={ElapsedMs}",
                traceId,
                context.Request.Path.Value,
                sw.ElapsedMilliseconds);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json; charset=utf-8";
            var message = _environment.IsDevelopment() ? ex.Message : "服务器内部错误";
            await context.Response
                .WriteAsJsonAsync(
                    new
                    {
                        success = false,
                        error = "unhandled",
                        traceId,
                        message
                    },
                    context.RequestAborted)
                .ConfigureAwait(false);
            return;
        }
    }

    private void LogRequestCompleted(HttpContext context, string traceId, long elapsedMs)
    {
        var userId = context.User?.FindFirst("user_id")?.Value;
        var tenantHeader = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        var path = context.Request.Path.Value;
        var providers = context.Items["Cjora.DataPermissionFilterProviders"] as string;

        string? dataScope = null;
        bool? bypass = null;
        try
        {
            var dp = context.RequestServices.GetService<IDataPermissionContext>();
            if (dp is not null)
            {
                dataScope = dp.Scope.ToString();
                bypass = dp.BypassRowLevelFilters;
            }
        }
        catch
        {
            dataScope = "unavailable";
        }

        _logger.LogInformation(
            "HttpRequest completed. TraceId={TraceId}, UserId={UserId}, TenantHeader={TenantHeader}, Path={Path}, ElapsedMs={ElapsedMs}, DataScope={DataScope}, BypassRowLevelFilters={BypassRowLevelFilters}, DataPermissionProviders={Providers}",
            traceId,
            userId,
            tenantHeader,
            path,
            elapsedMs,
            dataScope,
            bypass,
            providers);
    }
}
