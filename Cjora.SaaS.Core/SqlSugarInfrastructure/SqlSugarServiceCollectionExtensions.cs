using Cjora.SaaS.Core.DataPermission;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugarInfrastructure;

/// <summary>
/// SqlSugar 多租户 + 数据权限 依赖注入扩展。
/// </summary>
public static class SqlSugarServiceCollectionExtensions
{
    /// <summary>
    /// 注册 Scoped <see cref="ISqlSugarClient"/>（按租户/存储路由解析连接串）、
    /// <see cref="IDataPermissionContext"/> 及声明解析选项。
    /// </summary>
    /// <param name="services">服务集合。</param>
    /// <param name="configure">连接串、数据库类型等配置。</param>
    /// <returns>服务集合。</returns>
    /// <remarks>
    /// 请先调用 <see cref="Cjora.SaaS.Core.Extensions.ServiceCollectionExtensions.AddSaaSCore"/> 或 <see cref="Cjora.SaaS.Core.Extensions.ServiceCollectionExtensions.AddCjoraSaaSWithSqlSugar"/>，以便解析租户与用户声明。
    /// </remarks>
    public static IServiceCollection AddCjoraSqlSugarSaaS(
        this IServiceCollection services,
        Action<SqlSugarSaaSOptions> configure)
    {
        ArgumentNullException.ThrowIfNull(configure);

        services.AddOptions();
        services.Configure(configure);
        services.Configure<DataPermissionClaimOptions>(_ => { });
        services.TryAddScoped<IDataPermissionContext, DefaultDataPermissionContext>();
        services.AddScoped<ISqlSugarClient>(SqlSugarTenantClientFactory.Create);

        return services;
    }
}
