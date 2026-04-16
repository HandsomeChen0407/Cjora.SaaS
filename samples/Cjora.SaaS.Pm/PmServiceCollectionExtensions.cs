using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Pm.DataPermission;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Pm;

/// <summary>
/// PM 模块 DI 注册（可插拔：仅在宿主中调用时注册）。
/// </summary>
public static class PmServiceCollectionExtensions
{
    /// <summary>
    /// 注册 PM 项目域数据权限 Id 解析器。
    /// </summary>
    /// <remarks>
    /// 未调用本方法时，<see cref="Cjora.SaaS.Core.DataPermission.Enums.DataScopeKind.Project"/> 范围下
    /// 可访问项目 Id 列表为空，<c>.WithDataPermission()</c> 将返回零行。
    /// </remarks>
    public static IServiceCollection AddCjoraSaaSPmDataPermission(this IServiceCollection services)
    {
        services.AddScoped<IDataScopeIdResolver, ProjectDataScopeIdResolver>();
        return services;
    }
}
