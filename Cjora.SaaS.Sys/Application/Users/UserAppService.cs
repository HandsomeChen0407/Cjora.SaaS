using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Users.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Infrastructure.Repositories;

namespace Cjora.SaaS.Sys.Application.Users;

internal sealed class UserAppService : IUserAppService
{
    private readonly IUserRepository _users;

    public UserAppService(IUserRepository users)
    {
        _users = users;
    }

    public async Task<PagedResult<UserVm>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var page = await _users.GetPagedAsync(request, cancellationToken).ConfigureAwait(false);
        return new PagedResult<UserVm>
        {
            Items = page.Items.Select(static u => u.ToVm()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        };
    }

    public async Task<UserVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var u = await _users.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
        return u?.ToVm();
    }

    public async Task<long> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        ValidateCreate(request);
        var now = DateTime.UtcNow;
        var entity = new SysUser
        {
            LoginName = request.LoginName.Trim(),
            DisplayName = request.DisplayName.Trim(),
            IsActive = request.IsActive,
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName,
            ExternalSubjectId = request.ExternalSubjectId,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        return await _users.CreateAsync(entity, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> UpdateAsync(long id, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var u = await _users.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
        if (u is null) return false;

        u.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? u.DisplayName : request.DisplayName.Trim();
        u.IsActive = request.IsActive;
        u.DepartmentId = request.DepartmentId;
        u.DepartmentName = request.DepartmentName;
        u.ExternalSubjectId = request.ExternalSubjectId;
        u.UpdatedAtUtc = DateTime.UtcNow;
        await _users.UpdateAsync(u, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
        => _users.DeleteAsync(id, cancellationToken);

    private static void ValidateCreate(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LoginName))
        {
            throw new ArgumentException("LoginName 必填。", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            throw new ArgumentException("DisplayName 必填。", nameof(request));
        }
    }
}

internal static class UserMapping
{
    public static UserVm ToVm(this SysUser u) =>
        new(
            Id: u.Id,
            LoginName: u.LoginName,
            DisplayName: u.DisplayName,
            IsActive: u.IsActive,
            DepartmentId: u.DepartmentId,
            DepartmentName: u.DepartmentName,
            ExternalSubjectId: u.ExternalSubjectId,
            CreatorUserId: u.CreatorUserId,
            CreatedAtUtc: u.CreatedAtUtc,
            UpdatedAtUtc: u.UpdatedAtUtc);
}

