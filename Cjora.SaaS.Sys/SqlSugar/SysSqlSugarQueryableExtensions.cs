using Cjora.SaaS.Core.SqlSugar.Extensions;
using SqlSugar;

namespace Cjora.SaaS.Sys.SqlSugar;

/// <summary>
/// 对 Core <see cref="SqlSugarTenantQueryableExtensions"/> 的封装，便于在 IAM 代码中显式引用「清除过滤器」语义。
/// </summary>
/// <remarks>
/// 行为与 Core 完全一致；详见 Core 类型上的安全提示。
/// </remarks>
public static class SysSqlSugarQueryableExtensions
{
    /// <inheritdoc cref="SqlSugarTenantQueryableExtensions.ClearTenantFilters{TEntity}"/>
    public static ISugarQueryable<TEntity> SysClearTenantFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        return queryable.ClearTenantFilters();
    }

    /// <inheritdoc cref="SqlSugarTenantQueryableExtensions.ClearDataPermissionFilters{TEntity}"/>
    public static ISugarQueryable<TEntity> SysClearDataPermissionFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        return queryable.ClearDataPermissionFilters();
    }

    /// <inheritdoc cref="SqlSugarTenantQueryableExtensions.ClearAllSaaSFilters{TEntity}"/>
    public static ISugarQueryable<TEntity> SysClearAllSaaSFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        return queryable.ClearAllSaaSFilters();
    }
}
