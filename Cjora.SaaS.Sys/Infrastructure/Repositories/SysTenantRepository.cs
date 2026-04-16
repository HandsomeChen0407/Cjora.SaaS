using Cjora.SaaS.Core.SqlSugar.Constants;
using Cjora.SaaS.Sys.Entities;
using Microsoft.Extensions.DependencyInjection;
using SqlSugar;

namespace Cjora.SaaS.Sys.Repositories;

/// <summary>
/// 基于 Keyed <see cref="ISqlSugarClient"/>（目录库）的 <see cref="SysTenant"/> 仓储；独立物理库场景下 <c>sys_tenant</c> 仅存于平台主库。
/// </summary>
public sealed class SysTenantRepository : ISysTenantRepository
{
    private readonly ISqlSugarClient _databaseClient;

    /// <summary>
    /// 初始化 <see cref="SysTenantRepository"/>。
    /// </summary>
    /// <param name="databaseClient">连接 <see cref="Cjora.SaaS.Core.SqlSugar.Models.SqlSugarSaaSOptions.MasterConnectionString"/> 的 SqlSugar 客户端。</param>
    public SysTenantRepository([FromKeyedServices(SqlSugarKeyedServiceKeys.Catalog)] ISqlSugarClient databaseClient)
    {
        _databaseClient = databaseClient;
    }

    /// <inheritdoc />
    public async Task<SysTenant?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return null;
        }

        return await _databaseClient.Queryable<SysTenant>()
            .Where(t => t.Id == id)
            .FirstAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<SysTenant?> GetByTenantCodeAsync(string tenantCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantCode))
        {
            return null;
        }

        return await _databaseClient.Queryable<SysTenant>()
            .Where(t => t.TenantCode == tenantCode.Trim())
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
