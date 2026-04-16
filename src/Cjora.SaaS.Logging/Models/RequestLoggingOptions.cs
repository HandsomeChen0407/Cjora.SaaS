using System.Reflection;

namespace Cjora.SaaS.Logging.Models;

/// <summary>
/// 请求日志中间件配置。
/// </summary>
public sealed class RequestLoggingOptions
{
    /// <summary>跳过日志的路径前缀（如 <c>/health</c>、<c>/swagger</c>）。</summary>
    public HashSet<string> ExcludePaths { get; set; } = new(StringComparer.OrdinalIgnoreCase) { "/health", "/swagger" };

    /// <summary>为 <c>true</c> 时在 JSON 错误响应中包含异常详情（仅开发环境开启）。</summary>
    public bool IncludeExceptionDetail { get; set; }

    /// <summary>
    /// 服务名称，写入每条结构化日志的 <c>ServiceName</c> 字段。
    /// 默认使用入口程序集名称；微服务场景下建议显式设置（如 <c>"sys-api"</c>、<c>"crm-api"</c>）。
    /// </summary>
    public string ServiceName { get; set; } = Assembly.GetEntryAssembly()?.GetName().Name ?? "unknown";

    /// <summary>
    /// 实例标识，写入每条结构化日志的 <c>InstanceId</c> 字段。
    /// 默认使用机器名；容器化部署时建议设置为 Pod 名称或环境变量。
    /// </summary>
    public string InstanceId { get; set; } = Environment.MachineName;
}
