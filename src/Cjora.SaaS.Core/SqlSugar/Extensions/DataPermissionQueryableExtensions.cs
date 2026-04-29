using System.Linq.Expressions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Extensions;

/// <summary>
/// 服务层显式数据权限过滤扩展：根据 <see cref="IDataPermissionContext"/> 向查询追加 WHERE 条件。
/// </summary>
/// <remarks>
/// 租户过滤和软删除仍由 SqlSugar 全局 QueryFilter 自动处理；本扩展仅处理行级数据权限（部门 / 代理商 / 项目 / 客户 / 本人）。
/// </remarks>
public static class DataPermissionQueryableExtensions
{
    private static readonly IReadOnlyList<long> EmptyIds = Array.Empty<long>();

    /// <summary>
    /// 根据当前 <see cref="IDataPermissionContext"/> 向查询追加行级数据权限 WHERE 条件。
    /// </summary>
    /// <remarks>
    /// <para>运行时检测 <typeparamref name="TEntity"/> 实现的接口标记，并根据 <see cref="IDataPermissionContext.Scope"/> 构建对应过滤条件。</para>
    /// <para>当 Id 列表为空且当前 scope 需要该列表时，追加 <c>WHERE 1=0</c> 确保零行返回（安全兜底）。</para>
    /// </remarks>
    public static ISugarQueryable<TEntity> WithDataPermission<TEntity>(
        this ISugarQueryable<TEntity> queryable,
        IDataPermissionContext context) where TEntity : class, new()
    {
        if (context.IsDisabled || context.BypassRowLevelFilters)
            return queryable;

        return context.Scope switch
        {
            DataScopeKind.All or DataScopeKind.Tenant => queryable,
            DataScopeKind.Self => ApplySelfScope<TEntity>(queryable, context),
            DataScopeKind.Department => ApplyIdScope<TEntity, IDepartmentScopedEntity>(
                queryable, context.AccessibleDepartmentIds, static e => e.DepartmentId),
            DataScopeKind.Project => ApplyIdScope<TEntity, IProjectScopedEntity>(
                queryable, context.AccessibleProjectIds, static e => e.ProjectId),
            DataScopeKind.Customer => ApplyIdScope<TEntity, ICustomerScopedEntity>(
                queryable, context.AccessibleCustomerIds, static e => e.CustomerId),
            DataScopeKind.Agent => ApplyIdScope<TEntity, IAgentScopedEntity>(
                queryable, context.AccessibleAgentIds, static e => e.AgentId),
            _ => queryable
        };
    }

    private static ISugarQueryable<TEntity> ApplySelfScope<TEntity>(
        ISugarQueryable<TEntity> queryable,
        IDataPermissionContext context)
        where TEntity : class, new()
    {
        if (!typeof(ICreatorOwnedEntity).IsAssignableFrom(typeof(TEntity)))
            return queryable;

        if (context.CurrentUserId <= 0)
            return queryable.Where(_ => false);

        var userId = context.CurrentUserId;
        var param = Expression.Parameter(typeof(TEntity), "e");
        var prop = Expression.Property(param, nameof(ICreatorOwnedEntity.CreatorUserId));
        var eq = Expression.Equal(prop, Expression.Constant(userId));
        var lambda = Expression.Lambda<Func<TEntity, bool>>(eq, param);
        return queryable.Where(lambda);
    }

    private static ISugarQueryable<TEntity> ApplyIdScope<TEntity, TInterface>(
        ISugarQueryable<TEntity> queryable,
        IReadOnlyList<long> accessibleIds,
        Func<TInterface, long> _)
        where TEntity : class, new()
    {
        if (!typeof(TInterface).IsAssignableFrom(typeof(TEntity)))
            return queryable;

        if (accessibleIds is null || accessibleIds.Count == 0)
            return queryable.Where(_ => false);

        var propertyName = typeof(TInterface) switch
        {
            var t when t == typeof(IDepartmentScopedEntity) => nameof(IDepartmentScopedEntity.DepartmentId),
            var t when t == typeof(IProjectScopedEntity) => nameof(IProjectScopedEntity.ProjectId),
            var t when t == typeof(ICustomerScopedEntity) => nameof(ICustomerScopedEntity.CustomerId),
            var t when t == typeof(IAgentScopedEntity) => nameof(IAgentScopedEntity.AgentId),
            _ => throw new InvalidOperationException($"Unsupported scope interface: {typeof(TInterface).Name}")
        };

        var idList = accessibleIds.ToList();
        var param = Expression.Parameter(typeof(TEntity), "e");
        var prop = Expression.Property(param, propertyName);

        var containsMethod = typeof(List<long>).GetMethod(nameof(List<long>.Contains), new[] { typeof(long) })!;
        var call = Expression.Call(Expression.Constant(idList), containsMethod, prop);
        var lambda = Expression.Lambda<Func<TEntity, bool>>(call, param);
        return queryable.Where(lambda);
    }
}
