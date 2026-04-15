using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Constants;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
/// <para><b>与认证的顺序（重要）</b></para>
/// <para>
/// 若启用 <see cref="TenantOptions.EnableJwtClaimTenantResolution"/> 且依赖令牌中的租户声明，则必须在管道中把本中间件置于
/// <c>UseAuthentication()</c> <strong>之后</strong>，否则 <see cref="HttpContext.User"/> 未水合，JWT 分支恒为失败并可能回退到默认租户，
/// 存在串租或越权风险。仅使用 Header/子域名解析时可按网关模型前置或后置。
/// </para>
/// <para>
/// 当 JWT 租户解析开启而当前用户未认证时，会写入 <see cref="LogLevel.Warning"/> 级别日志，便于发现错误管道顺序或匿名流量误配置。
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
    /// <param name="logger">诊断日志。</param>
    /// <returns>异步任务。</returns>
    public async Task InvokeAsync(
        HttpContext context,
        IOptions<TenantOptions> optionsAccessor,
        ITenantIdentifierResolver tenantIdentifierResolver,
        ILogger<TenantMiddleware> logger)
    {
        var options = optionsAccessor.Value;

        var resolutionResult = await tenantIdentifierResolver.ResolveAsync(context, context.RequestAborted).ConfigureAwait(false);

        if (string.IsNullOrWhiteSpace(resolutionResult.TenantId))
        {
            throw new InvalidOperationException("TenantId cannot be resolved for this request. Default tenant fallback is forbidden.");
        }

        var tenantId = resolutionResult.TenantId;

        logger.LogInformation(
            "Tenant resolved: TenantId={TenantId}, Source={Source}, UsedDefaultFallback={UsedDefaultFallback}",
            tenantId,
            resolutionResult.ResolutionSourceName,
            resolutionResult.UsedDefaultFallback);

        if (options.EnableJwtClaimTenantResolution && context.User?.Identity?.IsAuthenticated != true)
        {
            logger.LogWarning(
                "EnableJwtClaimTenantResolution is true but the current user is not authenticated; JWT claim-based tenant resolution will be skipped for this request. If tenant id must come from JWT, register UseTenantResolution after UseAuthentication. See Cjora.SaaS.Core README (MultiTenancy / pipeline order).");
        }

        if (options.InjectDefaultTenantHeaderWhenMissing && !context.Request.Headers.ContainsKey(options.TenantIdHeaderName))
        {
            context.Request.Headers[options.TenantIdHeaderName] = tenantId;
        }

        context.Items[TenantHttpContextKeys.ResolvedTenantId] = tenantId;
        context.Items[TenantHttpContextKeys.ResolvedTenantSource] = resolutionResult.ResolutionSourceName;

        await _next(context).ConfigureAwait(false);
    }
}
