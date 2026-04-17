using System.Reflection;
using Microsoft.AspNetCore.Http;

namespace Cjora.SaaS.Logging.Models;

/// <summary>
/// 请求日志中间件 + 异常处理中间件共享配置。
/// </summary>
/// <remarks>
/// 绑定到 <see cref="SectionName"/> 配置节（默认 <c>CjoraObservability</c>）：
/// <code>
/// {
///   "CjoraObservability": {
///     "ServiceName": "sys-api",
///     "InstanceId": "pod-sys-api-1",
///     "IncludeExceptionDetail": false,
///     "ExcludePaths": [ "/health", "/swagger", "/metrics" ]
///   }
/// }
/// </code>
/// </remarks>
public sealed class RequestLoggingOptions
{
    /// <summary>配置节名称。</summary>
    public const string SectionName = "CjoraObservability";

    /// <summary>跳过日志 / 指标 / 链路采样的路径前缀（如 <c>/health</c>、<c>/swagger</c>）。</summary>
    public HashSet<string> ExcludePaths { get; set; } = new(StringComparer.OrdinalIgnoreCase) { "/health", "/swagger" };

    /// <summary>为 <c>true</c> 时在 JSON 错误响应中包含异常详情（仅开发环境开启）。</summary>
    public bool IncludeExceptionDetail { get; set; }

    /// <summary>
    /// 服务名称，写入每条结构化日志的 <c>ServiceName</c> 字段、Activity 的 <c>service.name</c> 资源属性、
    /// 以及指标的资源标签。默认使用入口程序集名称；微服务场景下建议显式设置（如 <c>"sys-api"</c>、<c>"crm-api"</c>）。
    /// </summary>
    public string ServiceName { get; set; } = Assembly.GetEntryAssembly()?.GetName().Name ?? "unknown";

    /// <summary>
    /// 实例标识，写入每条结构化日志的 <c>InstanceId</c> 字段。
    /// 默认使用机器名；容器化部署时建议设置为 Pod 名称或环境变量。
    /// </summary>
    public string InstanceId { get; set; } = Environment.MachineName;

    /// <summary>
    /// 请求响应头中 TraceId 的键名；默认 <c>X-Trace-Id</c>。
    /// 同时用于读取上游自定义 TraceId 传入（优先级低于 W3C <c>traceparent</c>）。
    /// </summary>
    public string TraceIdHeader { get; set; } = "X-Trace-Id";

    /// <summary>
    /// <c>Module</c> 字段解析器：用于每条日志 / 请求完成日志携带业务模块标识（<c>sys / crm / pm / ...</c>）。
    /// <para>
    /// 默认实现按"路由首段"推导：<c>/api/sys/users</c> → <c>sys</c>；<c>/api/crm/customers</c> → <c>crm</c>；
    /// 无法匹配时返回 <c>unknown</c>。业务代码也可通过 <c>HttpContext.Items["Cjora.Module"] = "..."</c> 显式覆盖。
    /// </para>
    /// </summary>
    public Func<HttpContext, string?> ModuleResolver { get; set; } = DefaultResolveModule;

    internal const string ModuleContextKey = "Cjora.Module";

    private static string? DefaultResolveModule(HttpContext context)
    {
        if (context.Items.TryGetValue(ModuleContextKey, out var explicitModule) && explicitModule is string str && !string.IsNullOrEmpty(str))
        {
            return str;
        }

        var path = context.Request.Path.Value;
        if (string.IsNullOrEmpty(path))
        {
            return null;
        }

        // 形如 "/api/sys/users" → segments [ "api", "sys", "users" ] → 取 segments[1]
        // 形如 "/sys/users"     → segments [ "sys", "users" ]          → 取 segments[0]
        ReadOnlySpan<char> span = path.AsSpan().TrimStart('/');
        var firstSlash = span.IndexOf('/');
        var first = firstSlash < 0 ? span : span[..firstSlash];

        if (first.Equals("api", StringComparison.OrdinalIgnoreCase))
        {
            if (firstSlash < 0)
            {
                return null;
            }
            var rest = span[(firstSlash + 1)..];
            var second = rest.IndexOf('/') is int i and >= 0 ? rest[..i] : rest;
            return second.IsEmpty ? null : second.ToString().ToLowerInvariant();
        }

        return first.IsEmpty ? null : first.ToString().ToLowerInvariant();
    }
}
