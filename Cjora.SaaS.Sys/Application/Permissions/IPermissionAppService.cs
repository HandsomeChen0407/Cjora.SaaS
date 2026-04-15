using Cjora.SaaS.Sys.Application.Permissions.Models;

namespace Cjora.SaaS.Sys.Application.Permissions;

public interface IPermissionAppService
{
    Task<IReadOnlyList<PermissionVm>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PermissionTreeNodeVm>> GetTreeAsync(CancellationToken cancellationToken = default);
    Task<PermissionVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CreateAsync(CreatePermissionRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(long id, UpdatePermissionRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
