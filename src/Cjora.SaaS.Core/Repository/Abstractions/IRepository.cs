using System.Linq.Expressions;

namespace Cjora.SaaS.Core.Repository.Abstractions;

/// <summary>
/// 租户作用域内的仓储抽象：所有查询在仓储实现层自动附加当前租户条件，新增时自动写入 <see cref="ITenantScopedEntity.TenantId"/>。
/// </summary>
/// <typeparam name="TEntity">实体类型，须实现 <see cref="ITenantScopedEntity"/>。</typeparam>
/// <remarks>
/// <para><b>能力边界（策略收敛）</b></para>
/// <para>
/// 本接口仅覆盖典型 CRUD 与分页清单：<c>GetListAsync</c>（无参/带谓词重载）、<c>GetSingleAsync</c>、<c>GetPagedListAsync</c>、
/// <c>InsertAsync</c>、<c>UpdateAsync</c>、<c>DeleteAsync</c>。
/// 复杂条件、多表联接、原生 SQL、聚合分析、批量条件更新等<strong>不建议</strong>继续向接口堆叠方法，以免仓储膨胀成「第二 ORM」。
/// 此类场景请直接注入 SqlSugar 的 <c>ISqlSugarClient</c>（或领域服务内封装），在显式租户/权限边界下编写查询，保持架构清晰。
/// </para>
/// <para><b>设计要点</b></para>
/// <list type="number">
/// <item><description>业务服务只写业务条件（例如 <c>u =&gt; u.IsActive</c>），不重复写 <c>TenantId</c>，降低遗漏导致的跨租户泄露风险。</description></item>
/// <item><description>租户标识来源统一为 <see cref="MultiTenancy.Abstractions.ITenantProvider"/>，与多租户中间件/解析器一致。</description></item>
/// <item><description>分页接口要求显式排序表达式，避免数据库在无 <c>ORDER BY</c> 时返回不稳定顺序。</description></item>
/// </list>
/// </remarks>
public interface IRepository<TEntity> where TEntity : class, ITenantScopedEntity, new()
{
    /// <summary>
    /// 获取当前租户下该实体的全部行（仍受数据权限全局过滤器约束）。
    /// </summary>
    Task<List<TEntity>> GetListAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 按业务谓词获取当前租户下的列表。
    /// </summary>
    /// <param name="predicate">业务过滤表达式（勿手写 <c>TenantId</c>）。</param>
    /// <param name="cancellationToken">取消标记。</param>
    Task<List<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

    /// <summary>
    /// 按业务谓词获取单条记录；命中多条时由底层 ORM 决定异常或首条行为。
    /// </summary>
    Task<TEntity?> GetSingleAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

    /// <summary>
    /// 分页查询，带稳定排序。
    /// </summary>
    Task<Models.PagedResult<TEntity>> GetPagedListAsync(
        Expression<Func<TEntity, bool>>? predicate,
        Models.PagedRequest request,
        Expression<Func<TEntity, object>> orderBy,
        bool ascending = true,
        CancellationToken cancellationToken = default);

    /// <summary>插入实体（<c>tenant_id</c> 等由 SqlSugar AOP 填充）。</summary>
    Task InsertAsync(TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>更新实体。</summary>
    Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>按业务谓词删除（仍受租户过滤器保护）。</summary>
    Task<int> DeleteAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);
}
