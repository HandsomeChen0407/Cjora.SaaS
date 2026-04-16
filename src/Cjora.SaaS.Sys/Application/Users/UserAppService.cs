using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Users.Models;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Cjora.SaaS.Sys.Infrastructure.Repositories;
using SqlSugar;

namespace Cjora.SaaS.Sys.Application.Users;

internal sealed class UserAppService : IUserAppService
{
    private readonly IUserRepository _users;
    private readonly IRepository<SysUserRole> _userRoles;
    private readonly IRepository<SysRole> _roles;
    private readonly IRepository<SysRoleDataScope> _roleDataScopes;
    private readonly ISqlSugarClient _db;
    private readonly ITenantProvider _tenantProvider;
    private readonly ISysSecurityCacheControl _securityCache;

    public UserAppService(
        IUserRepository users,
        IRepository<SysUserRole> userRoles,
        IRepository<SysRole> roles,
        IRepository<SysRoleDataScope> roleDataScopes,
        ISqlSugarClient db,
        ITenantProvider tenantProvider,
        ISysSecurityCacheControl securityCache)
    {
        _users = users;
        _userRoles = userRoles;
        _roles = roles;
        _roleDataScopes = roleDataScopes;
        _db = db;
        _tenantProvider = tenantProvider;
        _securityCache = securityCache;
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

    public async Task<UserVm?> GetByLoginNameAsync(string loginName, CancellationToken cancellationToken = default)
    {
        var u = await _users.GetByLoginNameAsync(loginName, cancellationToken).ConfigureAwait(false);
        return u?.ToVm();
    }

    public async Task<bool> VerifyPasswordAsync(string loginName, string password, CancellationToken cancellationToken = default)
    {
        var u = await _users.GetByLoginNameAsync(loginName, cancellationToken).ConfigureAwait(false);
        if (u is null || !u.IsActive) return false;
        if (string.IsNullOrEmpty(u.PasswordHash)) return false;
        return BCrypt.Net.BCrypt.Verify(password, u.PasswordHash);
    }

    public async Task<long> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        ValidateCreate(request);
        var now = DateTime.UtcNow;
        var entity = new SysUser
        {
            LoginName = request.LoginName.Trim(),
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = string.IsNullOrWhiteSpace(request.Password)
                ? null
                : BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = request.IsActive,
            DepartmentId = request.DepartmentId,
            ExternalSubjectId = request.ExternalSubjectId,
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
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
        u.ExternalSubjectId = request.ExternalSubjectId;
        u.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        u.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        u.UpdatedAtUtc = DateTime.UtcNow;
        await _users.UpdateAsync(u, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
        => _users.DeleteAsync(id, cancellationToken);

    public async Task<IReadOnlyList<UserRoleVm>> GetUserRolesAsync(long userId, CancellationToken cancellationToken = default)
    {
        var userRoles = await _userRoles.GetListAsync(ur => ur.UserId == userId, cancellationToken);
        if (userRoles.Count == 0) return [];

        var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
        var roles = await _roles.GetListAsync(r => roleIds.Contains(r.Id), cancellationToken);
        var roleDict = roles.ToDictionary(r => r.Id);

        return userRoles
            .Where(ur => roleDict.ContainsKey(ur.RoleId))
            .Select(ur =>
            {
                var role = roleDict[ur.RoleId];
                return new UserRoleVm(ur.Id, ur.RoleId, role.Code, role.Name);
            })
            .ToArray();
    }

    public async Task<bool> AssignRoleAsync(long userId, long roleId, CancellationToken cancellationToken = default)
    {
        var existing = await _userRoles.GetSingleAsync(
            ur => ur.UserId == userId && ur.RoleId == roleId, cancellationToken);
        if (existing is not null) return true;

        await _userRoles.InsertAsync(new SysUserRole
        {
            UserId = userId,
            RoleId = roleId,
            CreatorUserId = 0,
            CreatedAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await RebuildUserDataScopeAsync(userId, cancellationToken);
        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        await _securityCache.InvalidateDataPermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> RemoveRoleAsync(long userId, long roleId, CancellationToken cancellationToken = default)
    {
        var n = await _userRoles.DeleteAsync(ur => ur.UserId == userId && ur.RoleId == roleId, cancellationToken);
        if (n == 0) return false;

        await RebuildUserDataScopeAsync(userId, cancellationToken);
        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        await _securityCache.InvalidateDataPermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    private async Task RebuildUserDataScopeAsync(long userId, CancellationToken cancellationToken)
    {
        var tenantId = _tenantProvider.GetTenantId();

        await _db.Deleteable<SysUserDataScope>()
            .Where(uds => uds.TenantId == tenantId && uds.UserId == userId)
            .ExecuteCommandAsync(cancellationToken);

        var userRoles = await _userRoles.GetListAsync(ur => ur.UserId == userId, cancellationToken);
        var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
        if (roleIds.Count == 0) return;

        var dsEntries = await _roleDataScopes.GetListAsync(
            ds => roleIds.Contains(ds.RoleId), cancellationToken);

        var distinct = dsEntries
            .Select(ds => new { ds.ScopeType, ds.ScopeId })
            .Distinct()
            .ToList();

        foreach (var ds in distinct)
        {
            await _db.Insertable(new SysUserDataScope
            {
                TenantId = tenantId,
                UserId = userId,
                ScopeType = ds.ScopeType,
                ScopeId = ds.ScopeId,
                CreatedAtUtc = DateTime.UtcNow
            }).ExecuteCommandAsync(cancellationToken);
        }
    }

    private static void ValidateCreate(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LoginName))
            throw new ArgumentException("LoginName 必填。", nameof(request));
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ArgumentException("DisplayName 必填。", nameof(request));
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
            ExternalSubjectId: u.ExternalSubjectId,
            Email: u.Email,
            Phone: u.Phone,
            CreatorUserId: u.CreatorUserId,
            CreatedAtUtc: u.CreatedAtUtc,
            UpdatedAtUtc: u.UpdatedAtUtc);
}
