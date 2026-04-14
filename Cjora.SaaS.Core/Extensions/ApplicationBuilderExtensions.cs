using Cjora.SaaS.Core.MultiTenancy;
using Microsoft.AspNetCore.Builder;

namespace Cjora.SaaS.Core.Extensions;

/// <summary>
/// 与本库中间件相关的 <see cref="IApplicationBuilder"/> 扩展。
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// 注册租户解析中间件。
    /// </summary>
    /// <param name="application">应用构建器。</param>
    /// <returns>同一构建器。</returns>
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder application)
    {
        return application.UseMiddleware<TenantMiddleware>();
    }
}
