using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Core.MultiTenancy.Providers;
using Cjora.SaaS.Core.MultiTenancy.Resolvers;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Core.MultiTenancy.Hosting;

/// <summary>
/// 多租户相关服务的依赖注入扩展。
/// </summary>
public static class MultiTenancyServiceCollectionExtensions
{
    /// <summary>
    /// 注册租户解析器、HTTP 租户提供器及默认存储路由提供器。
    /// </summary>
    /// <param name="services">服务集合。</param>
    /// <param name="configureTenant">可选 <see cref="TenantOptions"/> 配置。</param>
    /// <param name="configureTenantStorageRouting">可选 <see cref="TenantStorageRoutingOptions"/>（独立物理库映射等）；宿主也可另行 <c>services.Configure&lt;TenantStorageRoutingOptions&gt;(configuration.GetSection(...))</c>。</param>
    /// <returns>服务集合。</returns>
    public static IServiceCollection AddCjoraMultiTenancy(
        this IServiceCollection services,
        Action<TenantOptions>? configureTenant = null,
        Action<TenantStorageRoutingOptions>? configureTenantStorageRouting = null)
    {
        services.AddOptions();

        if (configureTenant is not null)
        {
            services.Configure(configureTenant);
        }
        else
        {
            services.Configure<TenantOptions>(_ => { });
        }

        if (configureTenantStorageRouting is not null)
        {
            services.Configure(configureTenantStorageRouting);
        }
        else
        {
            services.Configure<TenantStorageRoutingOptions>(_ => { });
        }

        services.AddHttpContextAccessor();

        services.AddScoped<ITenantIdentifierResolver, TenantIdentifierResolver>();
        services.AddScoped<ITenantProvider, HttpTenantProvider>();
        // 后台任务租户上下文（AsyncLocal）：用于在无 HttpContext 时显式提供租户；否则应 Fail-Fast。
        services.AddSingleton<ITenantContextSetter, AsyncLocalTenantContextSetter>();
        services.AddSingleton<IBackgroundTenantExecutor, BackgroundTenantExecutor>();
        services.AddScoped<ITenantStorageRoutingProvider, ConfiguredTenantStorageRoutingProvider>();

        return services;
    }

    /// <summary>
    /// 将默认的 <see cref="ITenantStorageRoutingProvider"/> 替换为自定义实现（如目录库解析连接串）。
    /// </summary>
    /// <typeparam name="TProvider">自定义提供器类型。</typeparam>
    /// <param name="services">服务集合。</param>
    /// <returns>服务集合。</returns>
    /// <remarks>
    /// 请在 <see cref="AddCjoraMultiTenancy"/> 之后调用，以确保移除默认注册。
    /// </remarks>
    public static IServiceCollection ReplaceTenantStorageRoutingProvider<TProvider>(this IServiceCollection services)
        where TProvider : class, ITenantStorageRoutingProvider
    {
        var existing = services.Where(static d => d.ServiceType == typeof(ITenantStorageRoutingProvider)).ToList();
        foreach (var descriptor in existing)
        {
            services.Remove(descriptor);
        }

        services.AddScoped<ITenantStorageRoutingProvider, TProvider>();
        return services;
    }
}

