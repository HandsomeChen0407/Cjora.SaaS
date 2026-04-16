using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Pm.DataPermission;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Pm;

/// <summary>
/// PM 模块 DI 注册（可插拔：仅在宿主中调用时注册）。
/// </summary>
public static class PmServiceCollectionExtensions
{
    /// <summary>
    /// 注册 PM 项目域 SqlSugar 行级过滤器。
    /// </summary>
    /// <remarks>
    /// 未调用本方法时，宿主不得为用户颁发 <c>data_scope</c> = <see cref="Cjora.SaaS.Core.DataPermission.Enums.DataScopeKind.Project"/>，
    /// 否则创建 SqlSugar 客户端时将 Fail-Fast。
    /// </remarks>
    public static IServiceCollection AddCjoraSaaSPmDataPermission(this IServiceCollection services)
    {
        services.AddScoped<ISqlSugarDataPermissionFilterProvider, PmSqlSugarDataPermissionFilterProvider>();
        return services;
    }
}
