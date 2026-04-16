using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.Auth.Providers;
using Cjora.SaaS.Core.MultiTenancy.Hosting;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Core.DataProtection.Models;
using Cjora.SaaS.Core.SqlSugar.Hosting;
using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Core.Extensions;

/// <summary>
/// SqlSugar 多租户 SaaS 核心能力的依赖注入扩展（多租户解析 + 当前用户，供数据权限与 SqlSugar 集成使用）。
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 注册多租户解析、<see cref="ICurrentUser"/>；若使用 SqlSugar 集成，可改用 <see cref="AddCjoraSaaSWithSqlSugar"/> 一次注册。
    /// </summary>
    /// <param name="services">服务集合。</param>
    /// <param name="configureTenant">可选的 <see cref="TenantOptions"/> 配置委托。</param>
    /// <param name="configureTenantStorageRouting">可选的 <see cref="TenantStorageRoutingOptions"/> 配置委托。</param>
    /// <returns>服务集合。</returns>
    public static IServiceCollection AddSaaSCore(
        this IServiceCollection services,
        Action<TenantOptions>? configureTenant = null,
        Action<TenantStorageRoutingOptions>? configureTenantStorageRouting = null)
    {
        services.AddOptions();
        services.AddCjoraMultiTenancy(configureTenant, configureTenantStorageRouting);
        services.AddScoped<ICurrentUser, CurrentUser>();

        return services;
    }

    /// <summary>
    /// 等价于依次调用 <see cref="AddSaaSCore"/> 与 <see cref="SqlSugarServiceCollectionExtensions.AddCjoraSqlSugarSaaS"/>，减少宿主注册样板代码。
    /// </summary>
    /// <param name="services">服务集合。</param>
    /// <param name="configureTenant">可选租户选项。</param>
    /// <param name="configureSqlSugar">SqlSugar 连接与行为。</param>
    /// <param name="configureTenantStorageRouting">可选租户存储路由（独立物理库映射等）。</param>
    /// <param name="configureDataProtection">可选字段级 DataProtection（加密/哈希/自动解密等，默认全关）。</param>
    /// <returns>服务集合。</returns>
    public static IServiceCollection AddCjoraSaaSWithSqlSugar(
        this IServiceCollection services,
        Action<TenantOptions>? configureTenant,
        Action<SqlSugarSaaSOptions> configureSqlSugar,
        Action<TenantStorageRoutingOptions>? configureTenantStorageRouting = null,
        Action<DataProtectionOptions>? configureDataProtection = null)
    {
        ArgumentNullException.ThrowIfNull(configureSqlSugar);
        services.AddSaaSCore(configureTenant, configureTenantStorageRouting);
        services.AddCjoraSqlSugarSaaS(configureSqlSugar, configureDataProtection);
        return services;
    }
}
