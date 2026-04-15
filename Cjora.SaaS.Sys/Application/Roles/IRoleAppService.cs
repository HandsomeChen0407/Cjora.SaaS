using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Roles.Models;

namespace Cjora.SaaS.Sys.Application.Roles;

public interface IRoleAppService
{
    Task<PagedResult<RoleVm>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<RoleVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(long id, UpdateRoleRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<long>> GetPermissionIdsByRoleAsync(long roleId, CancellationToken cancellationToken = default);
}
