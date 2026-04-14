using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Repository;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UsersController : ControllerBase
{
    private readonly IRepository<SysUser> _users;

    public UsersController(IRepository<SysUser> users)
    {
        _users = users;
    }

    [HttpGet]
    public async Task<ActionResult<PagedApiResult<SysUserDto>>> GetPaged(
        [FromQuery] int pageNumber = SysPagedRequestDefaults.DefaultPageNumber,
        [FromQuery] int pageSize = SysPagedRequestDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var req = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var page = await _users.GetPagedListAsync(
            predicate: null,
            request: req,
            orderBy: u => u.Id,
            ascending: true,
            cancellationToken: cancellationToken);

        return Ok(new PagedApiResult<SysUserDto>
        {
            Items = page.Items.Select(static u => u.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        });
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SysUserDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var u = await _users.GetSingleAsync(x => x.Id == id, cancellationToken);
        return u is null ? NotFound() : Ok(u.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysUserDto>> Create([FromBody] SysUserCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LoginName) || string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest("LoginName 与 DisplayName 必填。");
        }

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

        await _users.InsertAsync(entity, cancellationToken);
        var created = await _users.GetSingleAsync(u => u.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取用户。") : CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SysUserDto>> Update(long id, [FromBody] SysUserUpdateRequest request, CancellationToken cancellationToken)
    {
        var u = await _users.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (u is null)
        {
            return NotFound();
        }

        u.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? u.DisplayName : request.DisplayName.Trim();
        u.IsActive = request.IsActive;
        u.DepartmentId = request.DepartmentId;
        u.DepartmentName = request.DepartmentName;
        u.ExternalSubjectId = request.ExternalSubjectId;
        u.UpdatedAtUtc = DateTime.UtcNow;
        await _users.UpdateAsync(u, cancellationToken);
        return Ok(u.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var n = await _users.DeleteAsync(u => u.Id == id, cancellationToken);
        return n == 0 ? NotFound() : NoContent();
    }
}
