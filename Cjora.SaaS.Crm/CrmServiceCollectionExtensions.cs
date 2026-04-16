using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Crm.DataPermission;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Crm;

/// <summary>
/// CRM 模块 DI 注册（可插拔：仅在宿主中调用时注册）。
/// </summary>
public static class CrmServiceCollectionExtensions
{
    /// <summary>
    /// 注册 CRM 客户域 SqlSugar 行级过滤器。
    /// </summary>
    /// <remarks>
    /// 未调用本方法时，宿主不得为用户颁发 <c>data_scope</c> = <see cref="Cjora.SaaS.Core.DataPermission.Enums.DataScopeKind.Customer"/>，
    /// 否则创建 SqlSugar 客户端时将 Fail-Fast。
    /// </remarks>
    public static IServiceCollection AddCjoraSaaSCrmDataPermission(this IServiceCollection services)
    {
        services.AddScoped<ISqlSugarDataPermissionFilterProvider, CrmSqlSugarDataPermissionFilterProvider>();
        return services;
    }
}
