using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Users.Models;

namespace Cjora.SaaS.Sys.Application.Users;

public interface IUserAppService
{
    Task<PagedResult<UserVm>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<UserVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(long id, UpdateUserRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}

