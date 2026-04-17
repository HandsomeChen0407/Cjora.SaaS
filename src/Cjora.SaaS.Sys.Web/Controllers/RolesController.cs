using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Api.Auth;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Roles;
using Cjora.SaaS.Sys.Application.Roles.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/sys/roles")]
public sealed class RolesController : ControllerBase
{
    private readonly IRoleAppService _roles;

    public RolesController(IRoleAppService roles)
    {
        _roles = roles;
    }

    [HttpGet]
    [AuthorizePermCode("sys:role:list")]
    public async Task<ActionResult<Result<PagedResponse<SysRoleDto>>>> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var page = await _roles.GetPagedAsync(new PagedRequest { PageNumber = pageNumber, PageSize = pageSize }, cancellationToken);
        return Ok(Result<PagedResponse<SysRoleDto>>.Ok(new PagedResponse<SysRoleDto>
        {
            Items = page.Items.Select(static r => r.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        }));
    }

    [HttpGet("{id:long}")]
    [AuthorizePermCode("sys:role:detail")]
    public async Task<ActionResult<Result<SysRoleDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var r = await _roles.GetByIdAsync(id, cancellationToken);
        return r is null ? NotFound(Result<SysRoleDto>.Fail("NotFound")) : Ok(Result<SysRoleDto>.Ok(r.ToDto()));
    }

    [HttpPost]
    [AuthorizePermCode("sys:role:create")]
    public async Task<ActionResult<Result<SysRoleDto>>> Create([FromBody] SysRoleCreateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _roles.CreateAsync(
                new CreateRoleRequest(request.Code, request.Name, request.IsSystem, request.IsActive,
                    request.DataScope, request.Remark, request.PermissionIds, request.DataScopeDeptIds),
                cancellationToken);

            var created = await _roles.GetByIdAsync(id, cancellationToken);
            return created is null
                ? Problem("插入后无法读取角色。")
                : CreatedAtAction(nameof(GetById), new { id }, Result<SysRoleDto>.Ok(created.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysRoleDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    [AuthorizePermCode("sys:role:update")]
    public async Task<ActionResult<Result<SysRoleDto>>> Update(long id, [FromBody] SysRoleUpdateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var ok = await _roles.UpdateAsync(id,
                new UpdateRoleRequest(request.Name, request.IsSystem, request.IsActive,
                    request.DataScope, request.Remark, request.PermissionIds, request.DataScopeDeptIds),
                cancellationToken);

            if (!ok) return NotFound(Result<SysRoleDto>.Fail("NotFound"));
            var updated = await _roles.GetByIdAsync(id, cancellationToken);
            return updated is null ? NotFound(Result<SysRoleDto>.Fail("NotFound")) : Ok(Result<SysRoleDto>.Ok(updated.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysRoleDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    [AuthorizePermCode("sys:role:delete")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        try
        {
            return await _roles.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound(Result.Fail("NotFound"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Result.Fail(ex.Message));
        }
    }

    [HttpGet("{roleId:long}/permissions")]
    [AuthorizePermCode("sys:role:permission:list")]
    public async Task<ActionResult<Result<IReadOnlyList<long>>>> GetPermissions(long roleId, CancellationToken cancellationToken)
    {
        var ids = await _roles.GetPermissionIdsByRoleAsync(roleId, cancellationToken);
        return Ok(Result<IReadOnlyList<long>>.Ok(ids));
    }
}
