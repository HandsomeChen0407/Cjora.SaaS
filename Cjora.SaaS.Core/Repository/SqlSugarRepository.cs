using System.Linq.Expressions;
using Cjora.SaaS.Core.MultiTenancy;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using SqlSugar;

namespace Cjora.SaaS.Core.Repository;

/// <summary>
/// 基于 SqlSugar 的租户仓储：默认依赖 <see cref="SqlSugar.ISqlSugarClient"/> 上由 <see cref="Cjora.SaaS.Core.SqlSugarInfrastructure.SqlSugarTenantClientFactory"/> 配置的全局 <c>QueryFilter</c>；
/// 查询侧不再重复拼接 <c>TenantId</c>（避免双重条件）；写入侧由 AOP 覆盖 <see cref="ITenantScopedEntity.TenantId"/>。
/// </summary>
/// <typeparam name="TEntity">实体类型。</typeparam>
/// <remarks>
/// <para><b>实现原理</b></para>
/// <para>
/// 1）<b>查询隔离</b>：使用 <c>_databaseClient.Queryable&lt;TEntity&gt;()</c>，由全局过滤器附加 <c>TenantId</c>（及可选数据权限条件）。
/// 若未注册 <c>AddCjoraSqlSugarSaaS</c>，请自行保证查询带租户谓词或使用本类旧版行为。
/// </para>
/// <para>
/// 2）<b>新增/更新注入</b>：由 SqlSugar <c>Aop.DataExecuting</c> 在插入与更新前覆盖 <see cref="ITenantScopedEntity.TenantId"/>。
/// </para>
/// <para>
/// 3）<b>更新</b>：与新增相同，由 AOP 同步 <c>TenantId</c>，避免实体在传输过程中被篡改租户列。
/// 数据库主键仍应保证在租户内或全局唯一，具体取决于你的表结构设计。
/// </para>
/// <para>
/// 4）<b>分页</b>：先对「租户过滤 + 业务条件」的查询克隆后做 <c>CountAsync</c> 得到 <see cref="PagedResult{TEntity}.TotalCount"/>，
/// 再对克隆查询排序并 <c>Skip/Take</c>（或驱动等价的分页 SQL），避免只查一页却漏掉总数的问题。
/// </para>
/// <para>
/// 说明：更强隔离可结合数据库行级安全（RLS）；应用层由 SqlSugar <c>QueryFilter</c> + AOP 提供默认实现。
/// </para>
/// </remarks>
public sealed class SqlSugarRepository<TEntity> : IRepository<TEntity>
    where TEntity : class, ITenantScopedEntity, new()
{
    private readonly ISqlSugarClient _databaseClient;
    private readonly ITenantProvider _tenantProvider;

    /// <summary>
    /// 初始化 <see cref="SqlSugarRepository{TEntity}"/>。
    /// </summary>
    /// <param name="databaseClient">SqlSugar 客户端。</param>
    /// <param name="tenantProvider">当前租户提供者。</param>
    public SqlSugarRepository(ISqlSugarClient databaseClient, ITenantProvider tenantProvider)
    {
        _databaseClient = databaseClient;
        _tenantProvider = tenantProvider;
    }

    /// <inheritdoc />
    public async Task<List<TEntity>> GetListAsync(CancellationToken cancellationToken = default)
    {
        return await TenantQuery().ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await TenantQuery().Where(predicate).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<TEntity?> GetSingleAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await TenantQuery().Where(predicate).FirstAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<PagedResult<TEntity>> GetPagedListAsync(
        Expression<Func<TEntity, bool>>? predicate,
        PagedRequest request,
        Expression<Func<TEntity, object>> orderBy,
        bool ascending = true,
        CancellationToken cancellationToken = default)
    {
        var (pageNumber, pageSize) = NormalizePaging(request);

        var filtered = predicate is null ? TenantQuery() : TenantQuery().Where(predicate);

        var totalCount = await filtered.Clone().CountAsync(cancellationToken);

        var ordered = ascending
            ? filtered.Clone().OrderBy(orderBy)
            : filtered.Clone().OrderByDescending(orderBy);

        var skip = (pageNumber - 1) * pageSize;
        var items = await ordered.Skip(skip).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResult<TEntity>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task InsertAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        // TenantId 由 SqlSugar AOP（SqlSugarTenantClientFactory）在 DataExecuting 阶段写入。
        await _databaseClient.Insertable(entity).ExecuteCommandAsync();
    }

    /// <inheritdoc />
    public async Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        await _databaseClient.Updateable(entity).ExecuteCommandAsync();
    }

    /// <inheritdoc />
    public async Task<int> DeleteAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantProvider.GetTenantId();
        return await _databaseClient.Deleteable<TEntity>()
            .Where(entity => entity.TenantId == tenantId)
            .Where(predicate)
            .ExecuteCommandAsync();
    }

    /// <summary>
    /// 获取查询对象：租户与数据权限条件由 ISqlSugarClient 全局 QueryFilter 注入。
    /// </summary>
    /// <returns>SqlSugar 查询对象。</returns>
    private ISugarQueryable<TEntity> TenantQuery() => _databaseClient.Queryable<TEntity>();

    /// <summary>
    /// 规范化页码与页大小，避免非法或过大的分页参数穿透到数据库。
    /// </summary>
    /// <param name="request">原始分页请求。</param>
    /// <returns>规范化后的页码与页大小。</returns>
    private static (int PageNumber, int PageSize) NormalizePaging(PagedRequest request)
    {
        var pageNumber = request.PageNumber < 1 ? 1 : request.PageNumber;
        var pageSize = request.PageSize < 1 ? 20 : request.PageSize;
        const int maxPageSize = 500;
        if (pageSize > maxPageSize)
        {
            pageSize = maxPageSize;
        }

        return (pageNumber, pageSize);
    }
}
