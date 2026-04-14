using System.Linq.Expressions;

namespace Cjora.SaaS.Core.Repository.Abstractions;

/// <summary>
/// 租户作用域内的仓储抽象：所有查询在仓储实现层自动附加当前租户条件，新增时自动写入 <see cref="ITenantScopedEntity.TenantId"/>。
/// </summary>
/// <typeparam name="TEntity">实体类型，须实现 <see cref="ITenantScopedEntity"/>。</typeparam>
/// <remarks>
/// 设计要点：
/// <list type="number">
/// <item><description>业务服务只写业务条件（例如 <c>u =&gt; u.IsActive</c>），不重复写 <c>TenantId</c>，降低遗漏导致的跨租户泄露风险。</description></item>
/// <item><description>租户标识来源统一为 <see cref="MultiTenancy.Abstractions.ITenantProvider"/>，与多租户中间件/解析器一致。</description></item>
/// <item><description>分页接口要求显式排序表达式，避免数据库在无 <c>ORDER BY</c> 时返回不稳定顺序。</description></item>
/// </list>
/// </remarks>
public interface IRepository<TEntity> where TEntity : class, ITenantScopedEntity, new()
{
    Task<List<TEntity>> GetListAsync(CancellationToken cancellationToken = default);

    Task<List<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

    Task<TEntity?> GetSingleAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

    Task<Models.PagedResult<TEntity>> GetPagedListAsync(
        Expression<Func<TEntity, bool>>? predicate,
        Models.PagedRequest request,
        Expression<Func<TEntity, object>> orderBy,
        bool ascending = true,
        CancellationToken cancellationToken = default);

    Task InsertAsync(TEntity entity, CancellationToken cancellationToken = default);

    Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default);

    Task<int> DeleteAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);
}

