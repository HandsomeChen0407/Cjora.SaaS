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

    Task<IReadOnlyList<UserRoleVm>> GetUserRolesAsync(long userId, CancellationToken cancellationToken = default);
    Task<bool> AssignRoleAsync(long userId, long roleId, CancellationToken cancellationToken = default);
    Task<bool> RemoveRoleAsync(long userId, long roleId, CancellationToken cancellationToken = default);

    Task<UserVm?> GetByLoginNameAsync(string loginName, CancellationToken cancellationToken = default);
    Task<bool> VerifyPasswordAsync(string loginName, string password, CancellationToken cancellationToken = default);
}
