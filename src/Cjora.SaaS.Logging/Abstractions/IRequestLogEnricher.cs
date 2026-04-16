using Microsoft.AspNetCore.Http;

namespace Cjora.SaaS.Logging.Abstractions;

/// <summary>
/// 请求日志扩展器。实现类向结构化日志字典追加领域专属字段（如 DataScope、Provider 列表）。
/// 通过 DI 注册（Singleton 或 Scoped 均可）；<see cref="Middleware.RequestLoggingMiddleware"/> 在每次请求完成后自动调用所有已注册实现。
/// </summary>
/// <remarks>
/// Logging 项目只定义此接口，不包含任何领域知识。领域实现（如 DataPermissionRequestLogEnricher）由各业务模块注册。
/// Enricher 内抛出的异常会被中间件静默吞掉，不影响主管道。
/// </remarks>
public interface IRequestLogEnricher
{
    /// <summary>
    /// 向 <paramref name="properties"/> 填充附加日志字段。
    /// 在响应管道完成后（或异常时）被调用；仅允许读取同步状态，不得执行异步操作。
    /// </summary>
    void Enrich(HttpContext context, IDictionary<string, object?> properties);
}
