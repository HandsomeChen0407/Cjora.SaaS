using Cjora.SaaS.Sys.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Repositories;

/// <summary>
/// 基于 <see cref="ISqlSugarClient"/> 的 <see cref="SysTenant"/> 仓储；依赖宿主注入的连接（共享库或主库）。
/// </summary>
public sealed class SysTenantRepository : ISysTenantRepository
{
    private readonly ISqlSugarClient _databaseClient;

    /// <summary>
    /// 初始化 <see cref="SysTenantRepository"/>。
    /// </summary>
    /// <param name="databaseClient">SqlSugar 客户端。</param>
    public SysTenantRepository(ISqlSugarClient databaseClient)
    {
        _databaseClient = databaseClient;
    }

    /// <inheritdoc />
    public async Task<SysTenant?> GetByIdAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            return null;
        }

        return await _databaseClient.Queryable<SysTenant>()
            .Where(t => t.Id == tenantId)
            .FirstAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SysTenant>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var list = await _databaseClient.Queryable<SysTenant>()
            .OrderBy(t => t.Id)
            .ToListAsync(cancellationToken);
        return list;
    }

    /// <inheritdoc />
    public async Task InsertAsync(SysTenant tenant, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(tenant);
        await _databaseClient.Insertable(tenant).ExecuteCommandAsync();
    }

    /// <inheritdoc />
    public async Task UpdateAsync(SysTenant tenant, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(tenant);
        await _databaseClient.Updateable(tenant).ExecuteCommandAsync();
    }
}
