using Cjora.SaaS.Core.DataPermission;
using Cjora.SaaS.Core.Repository;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugarInfrastructure;

/// <summary>
/// 在单次查询链上临时移除全局过滤器（管理员跨租户/跨部门运维场景）。
/// </summary>
/// <remarks>
/// <para>
/// SqlSugar 在 5.1.3.47+ 支持按接口类型清除过滤器；与 Scoped 客户端上注册的接口过滤器一一对应。
/// </para>
/// <para>
/// <b>安全提示</b>：调用这些方法后 SQL 将不再自动带 <c>TenantId</c> 等条件，务必在上层自行校验调用方具备平台级权限。
/// </para>
/// </remarks>
public static class SqlSugarTenantQueryableExtensions
{
    /// <summary>
    /// 仅移除租户相关全局过滤器（<see cref="ITenantScopedEntity"/>）。
    /// </summary>
    public static ISugarQueryable<TEntity> ClearTenantFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        return queryable.ClearFilter<ITenantScopedEntity>();
    }

    /// <summary>
    /// 移除部门/本人数据权限过滤器，保留租户过滤器。
    /// </summary>
    public static ISugarQueryable<TEntity> ClearDataPermissionFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        return queryable.ClearFilter<IDepartmentScopedEntity, ICreatorOwnedEntity>();
    }

    /// <summary>
    /// 移除本库注册的 SaaS 相关全部全局过滤器（租户 + 数据权限接口）。
    /// </summary>
    public static ISugarQueryable<TEntity> ClearAllSaaSFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        return queryable.ClearFilter<ITenantScopedEntity, IDepartmentScopedEntity, ICreatorOwnedEntity>();
    }
}
