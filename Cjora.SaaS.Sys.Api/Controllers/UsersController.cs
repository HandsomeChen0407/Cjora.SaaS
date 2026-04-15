using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Contracts.Users;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Users;
using Cjora.SaaS.Sys.Application.Users.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private readonly IUserAppService _users;

    public UsersController(IUserAppService users)
    {
        _users = users;
    }

    [HttpGet]
    public async Task<ActionResult<Result<PagedResponse<UserViewModel>>>> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var page = await _users.GetPagedAsync(new PagedRequest { PageNumber = pageNumber, PageSize = pageSize }, cancellationToken);
        return Ok(Result<PagedResponse<UserViewModel>>.Ok(new PagedResponse<UserViewModel>
        {
            Items = page.Items.Select(static x => x.ToApiVm()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        }));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<Result<UserViewModel>>> GetById(long id, CancellationToken cancellationToken)
    {
        var u = await _users.GetByIdAsync(id, cancellationToken);
        return u is null ? NotFound(Result<UserViewModel>.Fail("NotFound")) : Ok(Result<UserViewModel>.Ok(u.ToApiVm()));
    }

    [HttpPost]
    public async Task<ActionResult<Result<UserViewModel>>> Create([FromBody] CreateUserDto request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _users.CreateAsync(
                new CreateUserRequest(request.LoginName, request.DisplayName, request.IsActive,
                    request.DepartmentId, request.ExternalSubjectId, request.Email, request.Phone, request.Password),
                cancellationToken);

            var created = await _users.GetByIdAsync(id, cancellationToken);
            return created is null
                ? Problem("插入后无法读取用户。")
                : CreatedAtAction(nameof(GetById), new { id }, Result<UserViewModel>.Ok(created.ToApiVm()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<UserViewModel>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<Result<UserViewModel>>> Update(long id, [FromBody] UpdateUserDto request, CancellationToken cancellationToken)
    {
        var ok = await _users.UpdateAsync(id,
            new UpdateUserRequest(request.DisplayName, request.IsActive, request.DepartmentId,
                request.ExternalSubjectId, request.Email, request.Phone),
            cancellationToken);

        if (!ok) return NotFound(Result<UserViewModel>.Fail("NotFound"));
        var updated = await _users.GetByIdAsync(id, cancellationToken);
        return updated is null ? NotFound(Result<UserViewModel>.Fail("NotFound")) : Ok(Result<UserViewModel>.Ok(updated.ToApiVm()));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        return await _users.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound(Result.Fail("NotFound"));
    }

    // ──── Nested: api/users/{userId}/roles ────

    [HttpGet("{userId:long}/roles")]
    public async Task<ActionResult<Result<IReadOnlyList<UserRoleVm>>>> GetUserRoles(long userId, CancellationToken cancellationToken)
    {
        var roles = await _users.GetUserRolesAsync(userId, cancellationToken);
        return Ok(Result<IReadOnlyList<UserRoleVm>>.Ok(roles));
    }

    [HttpPost("{userId:long}/roles")]
    public async Task<ActionResult<Result>> AssignRole(long userId, [FromBody] SysUserRoleAssignRequest request, CancellationToken cancellationToken)
    {
        if (request.RoleId <= 0) return BadRequest(Result.Fail("RoleId 必填。"));
        await _users.AssignRoleAsync(userId, request.RoleId, cancellationToken);
        return Ok(Result.Ok());
    }

    [HttpDelete("{userId:long}/roles/{roleId:long}")]
    public async Task<IActionResult> RemoveRole(long userId, long roleId, CancellationToken cancellationToken)
    {
        var ok = await _users.RemoveRoleAsync(userId, roleId, cancellationToken);
        return ok ? NoContent() : NotFound(Result.Fail("NotFound"));
    }
}

internal static class UserApiMapping
{
    public static UserViewModel ToApiVm(this UserVm u) =>
        new()
        {
            Id = u.Id,
            LoginName = u.LoginName,
            DisplayName = u.DisplayName,
            IsActive = u.IsActive,
            DepartmentId = u.DepartmentId,
            ExternalSubjectId = u.ExternalSubjectId,
            Email = u.Email,
            Phone = u.Phone,
            CreatorUserId = u.CreatorUserId,
            CreatedAtUtc = u.CreatedAtUtc,
            UpdatedAtUtc = u.UpdatedAtUtc
        };
}
