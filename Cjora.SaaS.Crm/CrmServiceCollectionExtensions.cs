using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Crm.DataPermission;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Crm;

/// <summary>
/// CRM 模块 DI 注册。
/// </summary>
public static class CrmServiceCollectionExtensions
{
    /// <summary>
    /// 注册 CRM 客户域 SqlSugar 行级过滤器（<see cref="CrmSqlSugarDataPermissionFilterProvider"/>）。
    /// </summary>
    public static IServiceCollection AddCjoraSaaSCrmDataPermission(this IServiceCollection services)
    {
        services.AddScoped<ISqlSugarDataPermissionFilterProvider, CrmSqlSugarDataPermissionFilterProvider>();
        return services;
    }
}
