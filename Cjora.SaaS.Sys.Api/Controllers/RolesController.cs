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

        if (request.DataScope is not ("all" or "tenant" or "dept" or "self"))
        {
            return BadRequest("DataScope 仅支持 all / tenant / dept / self。");
        }

        if (request.DataScope == "dept" && (request.DeptIds is null || request.DeptIds.Count == 0))
        {
            return BadRequest("当 DataScope=dept 时，DeptIds 必填。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysRole
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            PermissionCodesJson = EntityMapper.ToPermissionCodesJson(request.PermissionCodes?.ToArray()),
            IsSystem = request.IsSystem,
            IsActive = request.IsActive,
            Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim(),
            MenuIdsJson = EntityMapper.ToStringArrayJson(request.MenuIds),
            DataScope = request.DataScope,
            DeptIdsJson = request.DataScope == "dept" ? EntityMapper.ToLongArrayJson(request.DeptIds) : null,
            SkipDataPerm = request.SkipDataPerm,
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

        if (request.DataScope is not ("all" or "tenant" or "dept" or "self"))
        {
            return BadRequest("DataScope 仅支持 all / tenant / dept / self。");
        }

        if (request.DataScope == "dept" && (request.DeptIds is null || request.DeptIds.Count == 0))
        {
            return BadRequest("当 DataScope=dept 时，DeptIds 必填。");
        }

        r.Name = string.IsNullOrWhiteSpace(request.Name) ? r.Name : request.Name.Trim();
        r.PermissionCodesJson = EntityMapper.ToPermissionCodesJson(request.PermissionCodes?.ToArray()) ?? r.PermissionCodesJson;
        r.IsSystem = request.IsSystem;
        r.IsActive = request.IsActive;
        r.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
        r.MenuIdsJson = EntityMapper.ToStringArrayJson(request.MenuIds);
        r.DataScope = request.DataScope;
        r.DeptIdsJson = request.DataScope == "dept" ? EntityMapper.ToLongArrayJson(request.DeptIds) : null;
        r.SkipDataPerm = request.SkipDataPerm;
        r.UpdatedAtUtc = DateTime.UtcNow;
        await _roles.UpdateAsync(r, cancellationToken);
        return Ok(r.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await _roles.DeleteAsync(x => x.Id == id, cancellationToken);
        return deleted > 0 ? NoContent() : NotFound();
    }
}
