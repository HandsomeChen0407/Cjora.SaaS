using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Repositories;

/// <summary>
/// 租户主数据访问；不经过 <see cref="Cjora.SaaS.Core.Repository.ITenantScopedEntity"/> 全局过滤器。
/// </summary>
public interface ISysTenantRepository
{
    /// <summary>
    /// 按主键获取租户。
    /// </summary>
    Task<SysTenant?> GetByIdAsync(long tenantId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 列出当前连接库中的全部租户行（共享物理库下为全平台列表）。仅限平台/运维场景使用。
    /// </summary>
    Task<IReadOnlyList<SysTenant>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 新增租户。
    /// </summary>
    Task InsertAsync(SysTenant tenant, CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新租户。
    /// </summary>
    Task UpdateAsync(SysTenant tenant, CancellationToken cancellationToken = default);
}
