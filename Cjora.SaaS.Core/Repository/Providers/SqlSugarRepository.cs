using System.Linq.Expressions;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Microsoft.Extensions.DependencyInjection;
using SqlSugar;

namespace Cjora.SaaS.Core.Repository.Providers;

/// <summary>
/// 基于 SqlSugar 的租户仓储：默认依赖 <see cref="ISqlSugarClient"/> 上由 <see cref="Cjora.SaaS.Core.SqlSugar.Providers.SqlSugarTenantClientFactory"/> 配置的全局 <c>QueryFilter</c>；
/// 查询侧不再重复拼接 <c>TenantId</c>（避免双重条件）；写入侧由 AOP 覆盖 <see cref="ITenantScopedEntity.TenantId"/>。
/// </summary>
public sealed class SqlSugarRepository<TEntity> : IRepository<TEntity>
    where TEntity : class, ITenantScopedEntity, new()
{
    private static readonly bool IsSoftDeletable = typeof(ISoftDeleteEntity).IsAssignableFrom(typeof(TEntity));

    private readonly ISqlSugarClient _databaseClient;
    private readonly ITenantProvider _tenantProvider;
    private readonly IServiceProvider _services;

    public SqlSugarRepository(ISqlSugarClient databaseClient, ITenantProvider tenantProvider, IServiceProvider services)
    {
        _databaseClient = databaseClient;
        _tenantProvider = tenantProvider;
        _services = services;
    }

    public async Task<List<TEntity>> GetListAsync(CancellationToken cancellationToken = default)
    {
        return await TenantQuery().ToListAsync(cancellationToken);
    }

    public async Task<List<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await TenantQuery().Where(predicate).ToListAsync(cancellationToken);
    }

    public async Task<TEntity?> GetSingleAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await TenantQuery().Where(predicate).FirstAsync(cancellationToken);
    }

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

    public async Task InsertAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        await _databaseClient.Insertable(entity).ExecuteCommandAsync();
    }

    public async Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        await _databaseClient.Updateable(entity).ExecuteCommandAsync();
    }

    public async Task<int> DeleteAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantProvider.GetTenantId();

        if (IsSoftDeletable)
        {
            var user = _services.GetService<ICurrentUser>();
            long? deleterId = user is { UserId: > 0 } ? user.UserId : null;
            var now = DateTime.UtcNow;

            // EnableUpdateQueryFilter 会自动附加租户与软删 WHERE 条件，此处显式加租户过滤保持双重防护一致性。
            return await _databaseClient.Updateable<TEntity>()
                .SetColumns(nameof(ISoftDeleteEntity.IsDeleted), true)
                .SetColumns(nameof(ISoftDeleteEntity.DeletedAtUtc), now)
                .SetColumns(nameof(ISoftDeleteEntity.DeleterUserId), deleterId)
                .Where(entity => entity.TenantId == tenantId)
                .Where(predicate)
                .ExecuteCommandAsync();
        }

        return await _databaseClient.Deleteable<TEntity>()
            .Where(entity => entity.TenantId == tenantId)
            .Where(predicate)
            .ExecuteCommandAsync();
    }

    private ISugarQueryable<TEntity> TenantQuery() => _databaseClient.Queryable<TEntity>();

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

