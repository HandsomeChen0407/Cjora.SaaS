using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Pm.DataPermission;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Pm;

/// <summary>
/// PM 模块 DI 注册。
/// </summary>
public static class PmServiceCollectionExtensions
{
    /// <summary>
    /// 注册 PM 项目域 SqlSugar 行级过滤器（<see cref="PmSqlSugarDataPermissionFilterProvider"/>）。
    /// </summary>
    public static IServiceCollection AddCjoraSaaSPmDataPermission(this IServiceCollection services)
    {
        services.AddScoped<ISqlSugarDataPermissionFilterProvider, PmSqlSugarDataPermissionFilterProvider>();
        return services;
    }
}
