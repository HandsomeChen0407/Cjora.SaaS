using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;

namespace Cjora.SaaS.Core.MultiTenancy.Resolvers;

/// <summary>
/// 默认租户解析：按固定顺序尝试 <b>请求头 → JWT 声明 → 子域名</b>，均未命中则返回未解析（禁止默认回退）。
/// </summary>
/// <remarks>
/// 将原 Contributor + 组合解析器合并为单类，减少扩展点与类型数量；若需完全自定义解析，可实现 <see cref="ITenantIdentifierResolver"/> 并替换 DI 注册。
/// </remarks>
public sealed class TenantIdentifierResolver : ITenantIdentifierResolver
{
    private readonly IOptions<TenantOptions> _optionsAccessor;

    /// <summary>
    /// 初始化 <see cref="TenantIdentifierResolver"/>。
    /// </summary>
    public TenantIdentifierResolver(IOptions<TenantOptions> optionsAccessor)
    {
        _optionsAccessor = optionsAccessor;
    }

    /// <inheritdoc />
    public ValueTask<TenantResolutionResult> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var options = _optionsAccessor.Value;

        if (TryResolveFromHeader(httpContext, options, out var fromHeader))
        {
            return ValueTask.FromResult(TenantResolutionResult.FromContributor(fromHeader, "Header"));
        }

        if (TryResolveFromJwtClaim(httpContext, options, out var fromJwt))
        {
            return ValueTask.FromResult(TenantResolutionResult.FromContributor(fromJwt, "JwtClaim"));
        }

        if (TryResolveFromSubdomain(httpContext, options, out var fromSub))
        {
            return ValueTask.FromResult(TenantResolutionResult.FromContributor(fromSub, "Subdomain"));
        }

        return ValueTask.FromResult(TenantResolutionResult.FromUnresolved());
    }

    private static bool TryResolveFromHeader(HttpContext httpContext, TenantOptions options, out string tenantId)
    {
        tenantId = string.Empty;
        if (!options.EnableHeaderTenantResolution)
        {
            return false;
        }

        if (!httpContext.Request.Headers.TryGetValue(options.TenantIdHeaderName, out var values))
        {
            return false;
        }

        var raw = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        tenantId = raw.Trim();
        return true;
    }

    private static bool TryResolveFromJwtClaim(HttpContext httpContext, TenantOptions options, out string tenantId)
    {
        tenantId = string.Empty;
        if (!options.EnableJwtClaimTenantResolution)
        {
            return false;
        }

        var user = httpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var claim = user.FindFirst(options.JwtTenantIdClaimType);
        if (claim is null || string.IsNullOrWhiteSpace(claim.Value))
        {
            return false;
        }

        tenantId = claim.Value.Trim();
        return true;
    }

    private static bool TryResolveFromSubdomain(HttpContext httpContext, TenantOptions options, out string tenantId)
    {
        tenantId = string.Empty;
        if (!options.EnableSubdomainTenantResolution)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(options.SubdomainParentHost))
        {
            return false;
        }

        var host = httpContext.Request.Host.Host;
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        var parentHost = options.SubdomainParentHost.Trim();
        if (!host.EndsWith(parentHost, StringComparison.OrdinalIgnoreCase) || host.Length <= parentHost.Length)
        {
            return false;
        }

        var prefixLength = host.Length - parentHost.Length;
        if (prefixLength < 2 || host[prefixLength - 1] != '.')
        {
            return false;
        }

        var prefix = host[..(prefixLength - 1)];
        if (string.IsNullOrWhiteSpace(prefix))
        {
            return false;
        }

        var tenantSlug = prefix.Split('.')[0];
        if (string.IsNullOrWhiteSpace(tenantSlug))
        {
            return false;
        }

        tenantId = tenantSlug;
        return true;
    }
}
