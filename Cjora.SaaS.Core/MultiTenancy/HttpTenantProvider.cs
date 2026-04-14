using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// 从 <see cref="Microsoft.AspNetCore.Http.HttpContext.Items"/> 读取 <see cref="TenantMiddleware"/> 写入的租户；
/// 若未经过中间件，则同步回退执行 <see cref="ITenantIdentifierResolver"/>。
/// </summary>
/// <remarks>
/// <para>
/// 常规路径：中间件已写入 <see cref="TenantHttpContextKeys.ResolvedTenantId"/>，本类直接读取，避免重复解析，保证整次请求租户一致。
/// </para>
/// <para>
/// 回退路径：集成测试或未跑完整管道时，通过同步等待 <see cref="ITenantIdentifierResolver.ResolveAsync"/> 复用同一套解析规则；生产环境已注册中间件时不应依赖此路径。
/// </para>
/// </remarks>
public sealed class HttpTenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ITenantIdentifierResolver _tenantIdentifierResolver;
    private readonly IOptions<TenantOptions> _optionsAccessor;

    /// <summary>
    /// 初始化 <see cref="HttpTenantProvider"/>。
    /// </summary>
    /// <param name="httpContextAccessor">HTTP 上下文访问器。</param>
    /// <param name="tenantIdentifierResolver">租户标识解析器（缓存未命中时使用）。</param>
    /// <param name="optionsAccessor">租户选项。</param>
    public HttpTenantProvider(
        IHttpContextAccessor httpContextAccessor,
        ITenantIdentifierResolver tenantIdentifierResolver,
        IOptions<TenantOptions> optionsAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
        _tenantIdentifierResolver = tenantIdentifierResolver;
        _optionsAccessor = optionsAccessor;
    }

    /// <inheritdoc />
    public string GetTenantId()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return _optionsAccessor.Value.DefaultTenantId;
        }

        if (TryGetCachedTenant(httpContext, out var cachedTenantId))
        {
            return cachedTenantId;
        }

        // 测试或未挂中间件：与中间件逻辑一致再走一遍解析链。
        var resolved = _tenantIdentifierResolver.ResolveAsync(httpContext).ConfigureAwait(false).GetAwaiter().GetResult();
        var tenantId = string.IsNullOrWhiteSpace(resolved.TenantId) ? _optionsAccessor.Value.DefaultTenantId : resolved.TenantId;
        return tenantId;
    }

    /// <inheritdoc />
    public string GetTenantResolutionSource()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return "Unknown";
        }

        if (httpContext.Items.TryGetValue(TenantHttpContextKeys.ResolvedTenantSource, out var sourceObject) && sourceObject is string source && !string.IsNullOrWhiteSpace(source))
        {
            return source;
        }

        if (!TryGetCachedTenant(httpContext, out _))
        {
            var resolved = _tenantIdentifierResolver.ResolveAsync(httpContext).ConfigureAwait(false).GetAwaiter().GetResult();
            return string.IsNullOrWhiteSpace(resolved.ResolutionSourceName) ? "Unknown" : resolved.ResolutionSourceName;
        }

        return "Unknown";
    }

    private static bool TryGetCachedTenant(HttpContext httpContext, out string tenantId)
    {
        if (httpContext.Items.TryGetValue(TenantHttpContextKeys.ResolvedTenantId, out var item) && item is string resolved && !string.IsNullOrWhiteSpace(resolved))
        {
            tenantId = resolved;
            return true;
        }

        tenantId = string.Empty;
        return false;
    }
}
