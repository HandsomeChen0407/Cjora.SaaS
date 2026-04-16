using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Departments.Models;

namespace Cjora.SaaS.Sys.Application.Departments;

public interface IDepartmentAppService
{
    Task<PagedResult<DepartmentVm>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<DepartmentVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DepartmentTreeNodeVm>> GetTreeAsync(CancellationToken cancellationToken = default);
    Task<long> CreateAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(long id, UpdateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
