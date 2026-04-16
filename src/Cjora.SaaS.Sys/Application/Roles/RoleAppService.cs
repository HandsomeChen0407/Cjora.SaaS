using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Roles.Models;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using SqlSugar;

namespace Cjora.SaaS.Sys.Application.Roles;

internal sealed class RoleAppService : IRoleAppService
{
    private readonly IRepository<SysRole> _roles;
    private readonly IRepository<SysRolePermission> _rolePerms;
    private readonly IRepository<SysRoleDataScope> _roleDataScopes;
    private readonly IRepository<SysUserRole> _userRoles;
    private readonly ISqlSugarClient _db;
    private readonly ITenantProvider _tenantProvider;
    private readonly ISysSecurityCacheControl _securityCache;

    public RoleAppService(
        IRepository<SysRole> roles,
        IRepository<SysRolePermission> rolePerms,
        IRepository<SysRoleDataScope> roleDataScopes,
        IRepository<SysUserRole> userRoles,
        ISqlSugarClient db,
        ITenantProvider tenantProvider,
        ISysSecurityCacheControl securityCache)
    {
        _roles = roles;
        _rolePerms = rolePerms;
        _roleDataScopes = roleDataScopes;
        _userRoles = userRoles;
        _db = db;
        _tenantProvider = tenantProvider;
        _securityCache = securityCache;
    }

    public async Task<PagedResult<RoleVm>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var page = await _roles.GetPagedListAsync(null, request, r => r.Id, true, cancellationToken);

        var roleIds = page.Items.Select(r => r.Id).ToList();
        var permMappings = await _rolePerms.GetListAsync(rp => roleIds.Contains(rp.RoleId), cancellationToken);
        var dsMappings = await _roleDataScopes.GetListAsync(ds => roleIds.Contains(ds.RoleId), cancellationToken);

        return new PagedResult<RoleVm>
        {
            Items = page.Items.Select(r => r.ToVm(
                permMappings.Where(rp => rp.RoleId == r.Id).Select(rp => rp.PermissionId).ToList(),
                dsMappings.Where(ds => ds.RoleId == r.Id && ds.ScopeType == "Department").Select(ds => ds.ScopeId).ToList()
            )).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        };
    }

    public async Task<RoleVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var r = await _roles.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (r is null) return null;

        var permIds = (await _rolePerms.GetListAsync(rp => rp.RoleId == id, cancellationToken))
            .Select(rp => rp.PermissionId).ToList();
        var dsIds = (await _roleDataScopes.GetListAsync(ds => ds.RoleId == id && ds.ScopeType == "Department", cancellationToken))
            .Select(ds => ds.ScopeId).ToList();

        return r.ToVm(permIds, dsIds);
    }

    public async Task<long> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("Code 必填。", nameof(request));
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name 必填。", nameof(request));
        ValidateDataScope(request.DataScope, request.DataScopeDeptIds);

        var now = DateTime.UtcNow;
        var entity = new SysRole
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            IsSystem = request.IsSystem,
            IsActive = request.IsActive,
            DataScope = request.DataScope,
            Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim(),
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _roles.InsertAsync(entity, cancellationToken);

        if (request.PermissionIds is { Count: > 0 })
        {
            foreach (var permId in request.PermissionIds.Distinct())
            {
                await _rolePerms.InsertAsync(new SysRolePermission
                {
                    RoleId = entity.Id,
                    PermissionId = permId,
                    CreatorUserId = 0,
                    CreatedAtUtc = now
                }, cancellationToken);
            }
        }

        if (request.DataScope == "dept" && request.DataScopeDeptIds is { Count: > 0 })
        {
            foreach (var deptId in request.DataScopeDeptIds.Distinct())
            {
                await _roleDataScopes.InsertAsync(new SysRoleDataScope
                {
                    RoleId = entity.Id,
                    ScopeType = "Department",
                    ScopeId = deptId,
                    CreatorUserId = 0,
                    CreatedAtUtc = now
                }, cancellationToken);
            }
        }

        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        await _securityCache.InvalidateDataPermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return entity.Id;
    }

    public async Task<bool> UpdateAsync(long id, UpdateRoleRequest request, CancellationToken cancellationToken = default)
    {
        var r = await _roles.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (r is null) return false;

        ValidateDataScope(request.DataScope, request.DataScopeDeptIds);

        r.Name = string.IsNullOrWhiteSpace(request.Name) ? r.Name : request.Name.Trim();
        r.IsSystem = request.IsSystem;
        r.IsActive = request.IsActive;
        r.DataScope = request.DataScope;
        r.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
        r.UpdatedAtUtc = DateTime.UtcNow;
        await _roles.UpdateAsync(r, cancellationToken);

        if (request.PermissionIds is not null)
        {
            await _rolePerms.DeleteAsync(rp => rp.RoleId == id, cancellationToken);
            var now = DateTime.UtcNow;
            foreach (var permId in request.PermissionIds.Distinct())
            {
                await _rolePerms.InsertAsync(new SysRolePermission
                {
                    RoleId = id,
                    PermissionId = permId,
                    CreatorUserId = 0,
                    CreatedAtUtc = now
                }, cancellationToken);
            }
        }

        await _roleDataScopes.DeleteAsync(ds => ds.RoleId == id, cancellationToken);
        if (request.DataScope == "dept" && request.DataScopeDeptIds is { Count: > 0 })
        {
            var now = DateTime.UtcNow;
            foreach (var deptId in request.DataScopeDeptIds.Distinct())
            {
                await _roleDataScopes.InsertAsync(new SysRoleDataScope
                {
                    RoleId = id,
                    ScopeType = "Department",
                    ScopeId = deptId,
                    CreatorUserId = 0,
                    CreatedAtUtc = now
                }, cancellationToken);
            }
        }

        await SyncUserDataScopesForRoleAsync(id, cancellationToken);

        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        await _securityCache.InvalidateDataPermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var r = await _roles.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (r is null) return false;
        if (r.IsSystem) throw new InvalidOperationException("内置角色不允许删除。");

        var affectedUsers = await _userRoles.GetListAsync(ur => ur.RoleId == id, cancellationToken);

        await _rolePerms.DeleteAsync(rp => rp.RoleId == id, cancellationToken);
        await _roleDataScopes.DeleteAsync(ds => ds.RoleId == id, cancellationToken);
        await _userRoles.DeleteAsync(ur => ur.RoleId == id, cancellationToken);
        await _roles.DeleteAsync(x => x.Id == id, cancellationToken);

        foreach (var ur in affectedUsers)
        {
            await RebuildUserDataScopeAsync(ur.UserId, cancellationToken);
        }

        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        await _securityCache.InvalidateDataPermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<IReadOnlyList<long>> GetPermissionIdsByRoleAsync(long roleId, CancellationToken cancellationToken = default)
    {
        var list = await _rolePerms.GetListAsync(rp => rp.RoleId == roleId, cancellationToken);
        return list.Select(rp => rp.PermissionId).ToList();
    }

    private async Task SyncUserDataScopesForRoleAsync(long roleId, CancellationToken cancellationToken)
    {
        var usersWithRole = await _userRoles.GetListAsync(ur => ur.RoleId == roleId, cancellationToken);
        foreach (var ur in usersWithRole)
        {
            await RebuildUserDataScopeAsync(ur.UserId, cancellationToken);
        }
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

    private static void ValidateDataScope(string dataScope, IReadOnlyList<long>? deptIds)
    {
        if (dataScope is not ("all" or "tenant" or "dept" or "self"))
            throw new ArgumentException("DataScope 仅支持 all / tenant / dept / self。");
        if (dataScope == "dept" && (deptIds is null || deptIds.Count == 0))
            throw new ArgumentException("当 DataScope=dept 时 DataScopeDeptIds 必填。");
    }
}

internal static class RoleMapping
{
    public static RoleVm ToVm(this SysRole r, IReadOnlyList<long> permissionIds, IReadOnlyList<long> dataScopeDeptIds) =>
        new(
            Id: r.Id,
            Code: r.Code,
            Name: r.Name,
            IsSystem: r.IsSystem,
            IsActive: r.IsActive,
            DataScope: r.DataScope,
            Remark: r.Remark,
            PermissionIds: permissionIds,
            DataScopeDeptIds: dataScopeDeptIds,
            CreatorUserId: r.CreatorUserId,
            CreatedAtUtc: r.CreatedAtUtc,
            UpdatedAtUtc: r.UpdatedAtUtc);
}
