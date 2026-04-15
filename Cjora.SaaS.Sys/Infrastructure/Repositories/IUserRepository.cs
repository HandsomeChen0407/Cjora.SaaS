using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Infrastructure.Repositories;

public interface IUserRepository
{
    Task<PagedResult<SysUser>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<SysUser?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CreateAsync(SysUser user, CancellationToken cancellationToken = default);
    Task UpdateAsync(SysUser user, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}

