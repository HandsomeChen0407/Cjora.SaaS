namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// <see cref="Microsoft.AspNetCore.Http.HttpContext.Items"/> 中与租户相关的键名常量。
/// </summary>
/// <remarks>
/// 集中定义避免拼写不一致；中间件在请求早期写入一次，后续即使 Header/Host 被改写仍以 Items 为准。
/// </remarks>
public static class TenantHttpContextKeys
{
    /// <summary>
    /// 解析后的租户标识。
    /// </summary>
    public const string ResolvedTenantId = "Cjora.SaaS.Core.MultiTenancy.ResolvedTenantId";

    /// <summary>
    /// 租户解析来源标签（如 Header、JwtClaim、Subdomain）。
    /// </summary>
    public const string ResolvedTenantSource = "Cjora.SaaS.Core.MultiTenancy.ResolvedTenantSource";
}
