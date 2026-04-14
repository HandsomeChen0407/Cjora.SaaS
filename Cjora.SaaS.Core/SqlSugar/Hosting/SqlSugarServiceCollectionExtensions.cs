using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Core.DataPermission.Providers;
using Cjora.SaaS.Core.SqlSugar.Models;
using Cjora.SaaS.Core.SqlSugar.Providers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Hosting;

/// <summary>
/// SqlSugar 多租户 + 数据权限 依赖注入扩展。
/// </summary>
public static class SqlSugarServiceCollectionExtensions
{
    /// <summary>
    /// 注册 Scoped <see cref="ISqlSugarClient"/>（按租户/存储路由解析连接串）、
    /// <see cref="IDataPermissionContext"/> 及声明解析选项。
    /// </summary>
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

