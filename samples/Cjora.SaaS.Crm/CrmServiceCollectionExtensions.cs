using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Crm.DataPermission;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Crm;

/// <summary>
/// CRM 模块 DI 注册（可插拔：仅在宿主中调用时注册）。
/// </summary>
public static class CrmServiceCollectionExtensions
{
    /// <summary>
    /// 注册 CRM 客户域数据权限 Id 解析器。
    /// </summary>
    /// <remarks>
    /// 未调用本方法时，<see cref="Cjora.SaaS.Core.DataPermission.Enums.DataScopeKind.Customer"/> 范围下
    /// 可访问客户 Id 列表为空，<c>.WithDataPermission()</c> 将返回零行。
    /// </remarks>
    public static IServiceCollection AddCjoraSaaSCrmDataPermission(this IServiceCollection services)
    {
        services.AddScoped<IDataScopeIdResolver, CustomerDataScopeIdResolver>();
        return services;
    }
}
