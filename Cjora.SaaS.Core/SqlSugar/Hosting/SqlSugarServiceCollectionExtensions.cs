using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Core.DataPermission.Providers;
using Cjora.SaaS.Core.DataProtection.Hosting;
using Cjora.SaaS.Core.DataProtection.Models;
using Cjora.SaaS.Core.SqlSugar.Constants;
using Cjora.SaaS.Core.SqlSugar.Models;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Providers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Hosting;

/// <summary>
/// SqlSugar 多租户 + 数据权限 + DataProtection 依赖注入扩展。
/// </summary>
public static class SqlSugarServiceCollectionExtensions
{
    /// <summary>
    /// 注册 Scoped <see cref="ISqlSugarClient"/>（按租户/存储路由解析连接串）、
    /// <see cref="IDataPermissionResolver"/>、<see cref="IDataPermissionContext"/>、<see cref="IDataPermissionScope"/>、DataProtection 默认实现及声明解析选项。
    /// </summary>
    public static IServiceCollection AddCjoraSqlSugarSaaS(
        this IServiceCollection services,
        Action<SqlSugarSaaSOptions> configure,
        Action<DataProtectionOptions>? configureDataProtection = null)
    {
        ArgumentNullException.ThrowIfNull(configure);

        services.AddOptions();
        services.Configure(configure);
        services.Configure<DataPermissionClaimOptions>(_ => { });
        services.AddCjoraDataProtection(configureDataProtection);
        services.TryAddScoped<DataPermissionScopeState>();
        services.TryAddScoped<IDataPermissionResolver, DefaultDataPermissionResolver>();
        services.TryAddScoped<IDataPermissionScope, DefaultDataPermissionScope>();
        services.TryAddScoped<IDataPermissionContext>(static sp =>
            new DefaultDataPermissionContext(
                sp.GetRequiredService<IDataPermissionResolver>(),
                sp.GetRequiredService<DataPermissionScopeState>()));
        services.TryAddScoped<ISqlSugarClientGuard, AsyncLocalSqlSugarClientGuard>();
        services.AddKeyedScoped<ISqlSugarClient>(
            SqlSugarKeyedServiceKeys.Catalog,
            static (sp, _) => SqlSugarCatalogClientFactory.Create(sp));
        services.AddScoped<ISqlSugarClient>(SqlSugarTenantClientFactory.Create);

        return services;
    }
}
