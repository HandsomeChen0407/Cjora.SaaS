using Cjora.SaaS.Sys.Api.Controllers;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Sys.Web;

/// <summary>
/// 注册 Sys.Api 控制器所在程序集（与生产宿主 / 示例宿主解耦）。
/// </summary>
public static class SysWebMvcExtensions
{
    /// <summary>
    /// 将 IAM 控制器程序集加入 MVC 部件发现。
    /// </summary>
    public static IMvcBuilder AddCjoraSysWebControllers(this IMvcBuilder mvc)
    {
        ArgumentNullException.ThrowIfNull(mvc);
        return mvc.AddApplicationPart(typeof(AuthController).Assembly);
    }
}
