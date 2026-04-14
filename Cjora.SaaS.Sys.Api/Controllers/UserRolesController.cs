using Cjora.SaaS.Core.Repository;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Repository;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UserRolesController : ControllerBase
{
    private readonly IRepository<SysUserRole> _userRoles;

    public UserRolesController(IRepository<SysUserRole> userRoles)
    {
        _userRoles = userRoles;
    }

    [HttpGet]
    public async Task<ActionResult<PagedApiResult<SysUserRoleDto>>> GetPaged(
        [FromQuery] int pageNumber = SysPagedRequestDefaults.DefaultPageNumber,
        [FromQuery] int pageSize = SysPagedRequestDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var req = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var page = await _userRoles.GetPagedListAsync(null, req, ur => ur.Id, true, cancellationToken);
        return Ok(new PagedApiResult<SysUserRoleDto>
        {
            Items = page.Items.Select(static ur => ur.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        });
    }

    [HttpPost]
    public async Task<ActionResult<SysUserRoleDto>> Assign([FromBody] SysUserRoleAssignRequest request, CancellationToken cancellationToken)
    {
        if (request.UserId <= 0 || request.RoleId <= 0)
        {
            return BadRequest("UserId 与 RoleId 必填。");
        }

        var existing = await _userRoles.GetSingleAsync(
            ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId,
            cancellationToken);
        if (existing is not null)
        {
            return Ok(existing.ToDto());
        }

        var now = DateTime.UtcNow;
        var entity = new SysUserRole
        {
            UserId = request.UserId,
            RoleId = request.RoleId,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _userRoles.InsertAsync(entity, cancellationToken);
        var created = await _userRoles.GetSingleAsync(ur => ur.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取关联。") : CreatedAtAction(null, created.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Remove(long id, CancellationToken cancellationToken)
    {
        var n = await _userRoles.DeleteAsync(ur => ur.Id == id, cancellationToken);
        return n == 0 ? NotFound() : NoContent();
    }
}
