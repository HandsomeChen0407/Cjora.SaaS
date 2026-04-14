using System.Linq.Expressions;

namespace Cjora.SaaS.Core.Repository;

/// <summary>
/// 租户作用域内的仓储抽象：所有查询在仓储实现层自动附加当前租户条件，新增时自动写入 <see cref="ITenantScopedEntity.TenantId"/>。
/// </summary>
/// <typeparam name="TEntity">实体类型，须实现 <see cref="ITenantScopedEntity"/>。</typeparam>
/// <remarks>
/// 设计要点：
/// <list type="number">
/// <item><description>业务服务只写业务条件（例如 <c>u =&gt; u.IsActive</c>），不重复写 <c>TenantId</c>，降低遗漏导致的跨租户泄露风险。</description></item>
/// <item><description>租户标识来源统一为 <see cref="Cjora.SaaS.Core.MultiTenancy.ITenantProvider"/>，与多租户中间件/解析器一致。</description></item>
/// <item><description>分页接口要求显式排序表达式，避免数据库在无 <c>ORDER BY</c> 时返回不稳定顺序。</description></item>
/// </list>
/// </remarks>
public interface IRepository<TEntity> where TEntity : class, ITenantScopedEntity, new()
{
    /// <summary>
    /// 查询当前租户下的全部实体（慎用，数据量大时优先分页）。
    /// </summary>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>实体列表。</returns>
    Task<List<TEntity>> GetListAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 按业务条件查询当前租户下的实体列表（已自动叠加租户过滤）。
    /// </summary>
    /// <param name="predicate">业务谓词。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>实体列表。</returns>
    Task<List<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取满足条件的单条记录（若无则返回 <see langword="null"/>），已自动叠加租户过滤。
    /// </summary>
    /// <param name="predicate">业务谓词。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>实体或 <see langword="null"/>。</returns>
    Task<TEntity?> GetSingleAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

    /// <summary>
    /// 分页查询：总条数与当页数据均只统计当前租户，并已叠加 <paramref name="predicate"/>。
    /// </summary>
    /// <param name="predicate">业务谓词；可为 <see langword="null"/> 表示仅按租户过滤。</param>
    /// <param name="request">分页参数。</param>
    /// <param name="orderBy">排序字段表达式（升序时）。</param>
    /// <param name="ascending">是否升序；为 <see langword="false"/> 时按该字段降序。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>分页结果。</returns>
    Task<PagedResult<TEntity>> GetPagedListAsync(
        Expression<Func<TEntity, bool>>? predicate,
        PagedRequest request,
        Expression<Func<TEntity, object>> orderBy,
        bool ascending = true,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 新增实体：在写入前将 <see cref="ITenantScopedEntity.TenantId"/> 覆盖为当前租户，避免客户端伪造租户字段。
    /// </summary>
    /// <param name="entity">待插入实体。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>表示异步操作的任务。</returns>
    Task InsertAsync(TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新实体：写入前将 <see cref="ITenantScopedEntity.TenantId"/> 同步为当前租户，降低误更新他租数据的风险（仍依赖主键/唯一约束设计）。
    /// </summary>
    /// <param name="entity">待更新实体。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>表示异步操作的任务。</returns>
    Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// 按条件删除当前租户内匹配的记录（自动叠加租户谓词与 <paramref name="predicate"/> 的 AND 关系）。
    /// </summary>
    /// <param name="predicate">业务谓词。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>受影响行数。</returns>
    Task<int> DeleteAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);
}
