using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Contracts.Users;
using Cjora.SaaS.Sys.Application.Users;
using Cjora.SaaS.Sys.Application.Users.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
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
        var req = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var page = await _users.GetPagedAsync(req, cancellationToken).ConfigureAwait(false);

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
        var u = await _users.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
        return u is null ? NotFound(Result<UserViewModel>.Fail("NotFound")) : Ok(Result<UserViewModel>.Ok(u.ToApiVm()));
    }

    [HttpPost]
    public async Task<ActionResult<Result<UserViewModel>>> Create([FromBody] CreateUserDto request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _users.CreateAsync(
                    new CreateUserRequest(
                        LoginName: request.LoginName,
                        DisplayName: request.DisplayName,
                        IsActive: request.IsActive,
                        DepartmentId: request.DepartmentId,
                        DepartmentName: request.DepartmentName,
                        ExternalSubjectId: request.ExternalSubjectId,
                        Email: request.Email,
                        Phone: request.Phone),
                    cancellationToken)
                .ConfigureAwait(false);

            var created = await _users.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
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
        var ok = await _users.UpdateAsync(
                id,
                new UpdateUserRequest(
                    DisplayName: request.DisplayName,
                    IsActive: request.IsActive,
                    DepartmentId: request.DepartmentId,
                    DepartmentName: request.DepartmentName,
                    ExternalSubjectId: request.ExternalSubjectId,
                    Email: request.Email,
                    Phone: request.Phone),
                cancellationToken)
            .ConfigureAwait(false);

        if (!ok) return NotFound(Result<UserViewModel>.Fail("NotFound"));
        var updated = await _users.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
        return updated is null ? NotFound(Result<UserViewModel>.Fail("NotFound")) : Ok(Result<UserViewModel>.Ok(updated.ToApiVm()));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var ok = await _users.DeleteAsync(id, cancellationToken).ConfigureAwait(false);
        return ok ? NoContent() : NotFound(Result.Fail("NotFound"));
    }
}

internal static class UserApiMapping
{
    public static UserViewModel ToApiVm(this Cjora.SaaS.Sys.Application.Users.Models.UserVm u) =>
        new()
        {
            Id = u.Id,
            LoginName = u.LoginName,
            DisplayName = u.DisplayName,
            IsActive = u.IsActive,
            DepartmentId = u.DepartmentId,
            DepartmentName = u.DepartmentName,
            ExternalSubjectId = u.ExternalSubjectId,
            Email = u.Email,
            Phone = u.Phone,
            CreatorUserId = u.CreatorUserId,
            CreatedAtUtc = u.CreatedAtUtc,
            UpdatedAtUtc = u.UpdatedAtUtc
        };
}
