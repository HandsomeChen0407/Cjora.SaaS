using Cjora.SaaS.Core.Repository;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Repository;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class RolesController : ControllerBase
{
    private readonly IRepository<SysRole> _roles;

    public RolesController(IRepository<SysRole> roles)
    {
        _roles = roles;
    }

    [HttpGet]
    public async Task<ActionResult<PagedApiResult<SysRoleDto>>> GetPaged(
        [FromQuery] int pageNumber = SysPagedRequestDefaults.DefaultPageNumber,
        [FromQuery] int pageSize = SysPagedRequestDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var req = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var page = await _roles.GetPagedListAsync(null, req, r => r.Id, true, cancellationToken);
        return Ok(new PagedApiResult<SysRoleDto>
        {
            Items = page.Items.Select(static r => r.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        });
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SysRoleDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var r = await _roles.GetSingleAsync(x => x.Id == id, cancellationToken);
        return r is null ? NotFound() : Ok(r.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysRoleDto>> Create([FromBody] SysRoleCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Code 与 Name 必填。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysRole
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            PermissionCodesJson = EntityMapper.ToPermissionCodesJson(request.PermissionCodes?.ToArray()),
            IsSystem = request.IsSystem,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _roles.InsertAsync(entity, cancellationToken);
        var created = await _roles.GetSingleAsync(r => r.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取角色。") : CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SysRoleDto>> Update(long id, [FromBody] SysRoleUpdateRequest request, CancellationToken cancellationToken)
    {
        var r = await _roles.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (r is null)
        {
            return NotFound();
        }

        r.Name = string.IsNullOrWhiteSpace(request.Name) ? r.Name : request.Name.Trim();
        r.PermissionCodesJson = EntityMapper.ToPermissionCodesJson(request.PermissionCodes?.ToArray()) ?? r.PermissionCodesJson;
        r.IsSystem = request.IsSystem;
        r.UpdatedAtUtc = DateTime.UtcNow;
        await _roles.UpdateAsync(r, cancellationToken);
        return Ok(r.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var n = await _roles.DeleteAsync(r => r.Id == id, cancellationToken);
        return n == 0 ? NotFound() : NoContent();
    }
}
