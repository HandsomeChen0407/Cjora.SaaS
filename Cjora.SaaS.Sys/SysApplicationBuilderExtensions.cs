using Cjora.SaaS.Core.Extensions;
using Microsoft.AspNetCore.Builder;

namespace Cjora.SaaS.Sys;

/// <summary>
/// IAM 宿主管道扩展：与 Core 多租户中间件对齐。
/// </summary>
public static class SysApplicationBuilderExtensions
{
    /// <summary>
    /// 注册租户解析中间件（内部调用 Core 的 <c>Cjora.SaaS.Core.Extensions.ApplicationBuilderExtensions.UseTenantResolution</c>）。
    /// </summary>
    /// <param name="application">应用构建器。</param>
    /// <returns>同一构建器。</returns>
    public static IApplicationBuilder UseCjoraSaaSSysTenantResolution(this IApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);
        return application.UseTenantResolution();
    }
}
