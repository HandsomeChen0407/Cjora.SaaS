using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.Diagnostics;
using Cjora.SaaS.Core.Repository.Abstractions;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Extensions;

/// <summary>
/// 在单次查询链上临时移除全局过滤器（管理员跨租户运维场景）。
/// </summary>
/// <remarks>
/// <para>全局 QueryFilter 仅包含租户隔离和软删除；行级数据权限由 <c>.WithDataPermission()</c> 显式处理。</para>
/// <para><b>安全提示</b>：调用这些方法后 SQL 将不再自动带 <c>TenantId</c> 等条件，务必在上层自行校验调用方具备平台级权限。</para>
/// </remarks>
public static class SqlSugarTenantQueryableExtensions
{
    /// <summary>
    /// 仅移除租户相关全局过滤器（<see cref="ITenantScopedEntity"/>）。
    /// </summary>
    public static ISugarQueryable<TEntity> ClearTenantFilters<TEntity>(this ISugarQueryable<TEntity> queryable)
        where TEntity : class, new()
    {
        throw new UnauthorizedAccessException(
            "ClearTenantFilters is restricted. Use ClearTenantFilters(queryable, currentUser) and ensure currentUser.IsSuperAdmin.");
    }

    /// <summary>
    /// 仅移除租户相关全局过滤器（<see cref="ITenantScopedEntity"/>），仅允许平台级超级管理员使用。
    /// </summary>
    public static ISugarQueryable<TEntity> ClearTenantFilters<TEntity>(
        this ISugarQueryable<TEntity> queryable,
        ICurrentUser currentUser)
        where TEntity : class, new()
    {
        if (!currentUser.IsSuperAdmin)
        {
            throw new UnauthorizedAccessException("ClearTenantFilters is restricted.");
        }

        SecurityAuditEventSource.Log.ClearTenantFilters(currentUser.UserId, currentUser.TenantId);
        return queryable.ClearFilter<ITenantScopedEntity>();
    }

    /// <summary>
    /// 在单次查询链上跳过软删除全局过滤器（可查询已逻辑删除的行），仅允许超级管理员。
    /// </summary>
    public static ISugarQueryable<TEntity> ClearSoftDeleteFilter<TEntity>(
        this ISugarQueryable<TEntity> queryable,
        ICurrentUser currentUser)
        where TEntity : class, new()
    {
        if (!currentUser.IsSuperAdmin)
        {
            throw new UnauthorizedAccessException("ClearSoftDeleteFilter is restricted to SuperAdmin.");
        }

        SecurityAuditEventSource.Log.ClearTenantFilters(currentUser.UserId, currentUser.TenantId);
        return queryable.ClearFilter<ISoftDeleteEntity>();
    }

    /// <summary>
    /// 移除本库注册的全部全局过滤器（租户 + 软删除）（框架内部：仅允许超级管理员）。
    /// </summary>
    internal static ISugarQueryable<TEntity> ClearAllSaaSFiltersInternal<TEntity>(
        this ISugarQueryable<TEntity> queryable,
        ICurrentUser currentUser)
        where TEntity : class, new()
    {
        if (!currentUser.IsSuperAdmin)
        {
            throw new UnauthorizedAccessException("Forbidden to clear SaaS filters.");
        }

        SecurityAuditEventSource.Log.ClearTenantFilters(currentUser.UserId, currentUser.TenantId);
        return queryable
            .ClearFilter<ISoftDeleteEntity>()
            .ClearFilter<ITenantScopedEntity>();
    }
}
