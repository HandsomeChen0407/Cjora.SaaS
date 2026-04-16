using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Infrastructure.Repositories;

internal sealed class SqlSugarUserRepository : IUserRepository
{
    private readonly IRepository<SysUser> _repository;

    public SqlSugarUserRepository(IRepository<SysUser> repository)
    {
        _repository = repository;
    }

    public Task<PagedResult<SysUser>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
        => _repository.GetPagedListAsync(null, request, u => u.Id, true, cancellationToken);

    public Task<SysUser?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => _repository.GetSingleAsync(u => u.Id == id, cancellationToken);

    public Task<SysUser?> GetByLoginNameAsync(string loginName, CancellationToken cancellationToken = default)
        => _repository.GetSingleAsync(u => u.LoginName == loginName, cancellationToken);

    public async Task<long> CreateAsync(SysUser user, CancellationToken cancellationToken = default)
    {
        await _repository.InsertAsync(user, cancellationToken).ConfigureAwait(false);
        return user.Id;
    }

    public Task UpdateAsync(SysUser user, CancellationToken cancellationToken = default)
        => _repository.UpdateAsync(user, cancellationToken);

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var n = await _repository.DeleteAsync(u => u.Id == id, cancellationToken).ConfigureAwait(false);
        return n > 0;
    }
}
