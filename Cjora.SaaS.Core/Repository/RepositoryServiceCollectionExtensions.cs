using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Core.Repository;

/// <summary>
/// 仓储相关的依赖注入扩展。
/// </summary>
public static class RepositoryServiceCollectionExtensions
{
    /// <summary>
    /// 注册基于 SqlSugar 的租户隔离仓储实现（每个实体类型一次注册）。
    /// </summary>
    /// <typeparam name="TEntity">实现 <see cref="ITenantScopedEntity"/> 的实体。</typeparam>
    /// <param name="services">服务集合。</param>
    /// <returns>服务集合。</returns>
    /// <remarks>
    /// 调用前请确保已注册 <c>ISqlSugarClient</c>（<see cref="SqlSugarInfrastructure.SqlSugarServiceCollectionExtensions.AddCjoraSqlSugarSaaS"/>）以及 <see cref="Cjora.SaaS.Core.MultiTenancy.ITenantProvider"/>（<see cref="Extensions.ServiceCollectionExtensions.AddSaaSCore"/>）。
    /// </remarks>
    public static IServiceCollection AddSqlSugarTenantRepository<TEntity>(this IServiceCollection services)
        where TEntity : class, ITenantScopedEntity, new()
    {
        services.AddScoped<IRepository<TEntity>, SqlSugarRepository<TEntity>>();
        return services;
    }
}
