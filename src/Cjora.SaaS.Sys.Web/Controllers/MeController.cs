using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Sys.Api.Auth;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Permissions;
using Cjora.SaaS.Sys.Application.Users;
using Cjora.SaaS.Sys.Permissions;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/sys/me")]
public sealed class MeController : ControllerBase
{
    private readonly IUserAppService _users;
    private readonly IEffectivePermissionResolver _permResolver;
    private readonly IPermissionAppService _perms;
    private readonly ICurrentUser _currentUser;

    public MeController(
        IUserAppService users,
        IEffectivePermissionResolver permResolver,
        IPermissionAppService perms,
        ICurrentUser currentUser)
    {
        _users = users;
        _permResolver = permResolver;
        _perms = perms;
        _currentUser = currentUser;
    }

    [HttpGet]
    [AuthorizePermCode("sys:me:read")]
    public async Task<ActionResult<Result<CurrentUserDto>>> GetMe(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        if (userId <= 0) return Unauthorized(Result<CurrentUserDto>.Fail("Unauthorized"));

        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null) return NotFound(Result<CurrentUserDto>.Fail("NotFound"));

        var permCodes = await _permResolver.GetEffectivePermissionCodesAsync(userId, cancellationToken);
        var permIds = await _permResolver.GetEffectivePermissionIdsAsync(userId, cancellationToken);
        var allPerms = await _perms.GetTreeAsync(cancellationToken);

        var roles = await _users.GetUserRolesAsync(userId, cancellationToken);

        var menuTree = FilterTreeByPermIds(allPerms, permIds);

        return Ok(Result<CurrentUserDto>.Ok(new CurrentUserDto
        {
            Id = user.Id,
            LoginName = user.LoginName,
            DisplayName = user.DisplayName,
            DepartmentId = user.DepartmentId,
            PermissionCodes = permCodes.ToList(),
            MenuTree = menuTree,
            Roles = roles.Select(r => r.RoleCode).ToList()
        }));
    }

    private static IReadOnlyList<SysPermissionTreeNodeDto> FilterTreeByPermIds(
        IReadOnlyList<Application.Permissions.Models.PermissionTreeNodeVm> nodes,
        IReadOnlySet<long> permIds)
    {
        var result = new List<SysPermissionTreeNodeDto>();
        foreach (var node in nodes)
        {
            var filteredChildren = FilterTreeByPermIds(node.Children, permIds);
            if (permIds.Contains(node.Id) || filteredChildren.Count > 0)
            {
                result.Add(new SysPermissionTreeNodeDto
                {
                    Id = node.Id,
                    ParentId = node.ParentId,
                    Label = node.Label,
                    NodeType = node.NodeType,
                    Path = node.Path,
                    PermCode = node.PermCode,
                    Icon = node.Icon,
                    SortOrder = node.SortOrder,
                    IsVisible = node.IsVisible,
                    IsActive = node.IsActive,
                    Children = filteredChildren
                });
            }
        }

        return result;
    }
}
