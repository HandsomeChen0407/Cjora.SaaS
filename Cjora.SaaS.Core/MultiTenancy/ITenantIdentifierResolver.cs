using Microsoft.AspNetCore.Http;

namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// 从 HTTP 上下文解析租户标识；默认实现为 <see cref="TenantIdentifierResolver"/>（头 → JWT → 子域 → 默认）。
/// </summary>
public interface ITenantIdentifierResolver
{
    /// <summary>
    /// 解析当前请求的租户标识。
    /// </summary>
    /// <param name="httpContext">HTTP 上下文。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>租户标识与来源说明；无匹配时由实现回退默认租户。</returns>
    ValueTask<TenantResolutionResult> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default);
}
