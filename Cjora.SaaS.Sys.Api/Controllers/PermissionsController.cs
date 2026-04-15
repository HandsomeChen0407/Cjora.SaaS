using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Permissions;
using Cjora.SaaS.Sys.Application.Permissions.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/permissions")]
[Authorize]
public sealed class PermissionsController : ControllerBase
{
    private readonly IPermissionAppService _perms;

    public PermissionsController(IPermissionAppService perms)
    {
        _perms = perms;
    }

    [HttpGet]
    public async Task<ActionResult<Result<IReadOnlyList<SysPermissionDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _perms.GetAllAsync(cancellationToken);
        return Ok(Result<IReadOnlyList<SysPermissionDto>>.Ok(list.Select(static p => p.ToDto()).ToArray()));
    }

    [HttpGet("tree")]
    public async Task<ActionResult<Result<IReadOnlyList<SysPermissionTreeNodeDto>>>> GetTree(CancellationToken cancellationToken)
    {
        var tree = await _perms.GetTreeAsync(cancellationToken);
        return Ok(Result<IReadOnlyList<SysPermissionTreeNodeDto>>.Ok(tree.Select(static n => n.ToTreeDto()).ToArray()));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<Result<SysPermissionDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var p = await _perms.GetByIdAsync(id, cancellationToken);
        return p is null ? NotFound(Result<SysPermissionDto>.Fail("NotFound")) : Ok(Result<SysPermissionDto>.Ok(p.ToDto()));
    }

    [HttpPost]
    public async Task<ActionResult<Result<SysPermissionDto>>> Create([FromBody] SysPermissionCreateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _perms.CreateAsync(
                new CreatePermissionRequest(request.ParentId, request.Label, request.NodeType,
                    request.Path, request.PermCode, request.Icon, request.SortOrder, request.IsVisible, request.IsActive),
                cancellationToken);

            var created = await _perms.GetByIdAsync(id, cancellationToken);
            return created is null
                ? Problem("插入后无法读取权限节点。")
                : CreatedAtAction(nameof(GetById), new { id }, Result<SysPermissionDto>.Ok(created.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysPermissionDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<Result<SysPermissionDto>>> Update(long id, [FromBody] SysPermissionUpdateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var ok = await _perms.UpdateAsync(id,
                new UpdatePermissionRequest(request.ParentId, request.Label, request.NodeType,
                    request.Path, request.PermCode, request.Icon, request.SortOrder, request.IsVisible, request.IsActive),
                cancellationToken);

            if (!ok) return NotFound(Result<SysPermissionDto>.Fail("NotFound"));
            var updated = await _perms.GetByIdAsync(id, cancellationToken);
            return updated is null ? NotFound(Result<SysPermissionDto>.Fail("NotFound")) : Ok(Result<SysPermissionDto>.Ok(updated.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysPermissionDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        try
        {
            return await _perms.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound(Result.Fail("NotFound"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Result.Fail(ex.Message));
        }
    }
}
