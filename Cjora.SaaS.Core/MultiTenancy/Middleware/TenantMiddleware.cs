using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Constants;
using Cjora.SaaS.Core.MultiTenancy.Models;

namespace Cjora.SaaS.Core.MultiTenancy.Middleware;

/// <summary>
/// 在管道中解析租户标识，并写入 <see cref="Microsoft.AspNetCore.Http.HttpContext.Items"/> 供全链路复用。
/// </summary>
/// <remarks>
/// <para><b>职责</b></para>
/// <list type="number">
/// <item><description>调用 <see cref="ITenantIdentifierResolver"/>（默认：请求头 → JWT 声明 → 子域名 → 默认租户）。</description></item>
/// <item><description>将最终租户标识与解析来源写入 <see cref="TenantHttpContextKeys"/>，避免后续组件重复解析。</description></item>
/// <item><description>可选地把租户写回配置请求头，兼容只读 Header 的下游逻辑。</description></item>
/// </list>
/// <para><b>与认证的顺序</b></para>
/// <para>
/// 若租户仅来自 JWT，应在 <c>UseAuthentication</c> 之后注册本中间件；若来自 Header/子域名且认证策略依赖租户，则按安全模型前置或后置。
/// </para>
/// </remarks>
public sealed class TenantMiddleware
{
    private readonly RequestDelegate _next;

    /// <summary>
    /// 初始化 <see cref="TenantMiddleware"/>。
    /// </summary>
    /// <param name="next">下一个中间件。</param>
    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    /// <summary>
    /// 执行中间件。
    /// </summary>
    /// <param name="context">HTTP 上下文。</param>
    /// <param name="optionsAccessor">租户选项。</param>
    /// <param name="tenantIdentifierResolver">租户解析器。</param>
    /// <returns>异步任务。</returns>
    public async Task InvokeAsync(
        HttpContext context,
        IOptions<TenantOptions> optionsAccessor,
        ITenantIdentifierResolver tenantIdentifierResolver)
    {
        var options = optionsAccessor.Value;

        var resolutionResult = await tenantIdentifierResolver.ResolveAsync(context, context.RequestAborted).ConfigureAwait(false);

        // 组合解析器在无匹配时会回退默认租户；此处再防一层配置为空。
        var tenantId = string.IsNullOrWhiteSpace(resolutionResult.TenantId) ? options.DefaultTenantId : resolutionResult.TenantId;

        if (options.InjectDefaultTenantHeaderWhenMissing && !context.Request.Headers.ContainsKey(options.TenantIdHeaderName))
        {
            // 部分组件只认 Header，与 Items / ITenantProvider 对齐。
            context.Request.Headers[options.TenantIdHeaderName] = tenantId;
        }

        context.Items[TenantHttpContextKeys.ResolvedTenantId] = tenantId;
        context.Items[TenantHttpContextKeys.ResolvedTenantSource] = resolutionResult.ResolutionSourceName;

        await _next(context).ConfigureAwait(false);
    }
}
