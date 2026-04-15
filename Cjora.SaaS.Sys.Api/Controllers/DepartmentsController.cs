using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Departments;
using Cjora.SaaS.Sys.Application.Departments.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public sealed class DepartmentsController : ControllerBase
{
    private readonly IDepartmentAppService _departments;

    public DepartmentsController(IDepartmentAppService departments)
    {
        _departments = departments;
    }

    [HttpGet]
    public async Task<ActionResult<Result<PagedResponse<SysDepartmentDto>>>> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var page = await _departments.GetPagedAsync(new PagedRequest { PageNumber = pageNumber, PageSize = pageSize }, cancellationToken);
        return Ok(Result<PagedResponse<SysDepartmentDto>>.Ok(new PagedResponse<SysDepartmentDto>
        {
            Items = page.Items.Select(static d => d.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        }));
    }

    [HttpGet("tree")]
    public async Task<ActionResult<Result<IReadOnlyList<SysDepartmentTreeNodeDto>>>> GetTree(CancellationToken cancellationToken)
    {
        var tree = await _departments.GetTreeAsync(cancellationToken);
        return Ok(Result<IReadOnlyList<SysDepartmentTreeNodeDto>>.Ok(
            tree.Select(static n => n.ToTreeDto()).ToArray()));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<Result<SysDepartmentDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var d = await _departments.GetByIdAsync(id, cancellationToken);
        return d is null ? NotFound(Result<SysDepartmentDto>.Fail("NotFound")) : Ok(Result<SysDepartmentDto>.Ok(d.ToDto()));
    }

    [HttpPost]
    public async Task<ActionResult<Result<SysDepartmentDto>>> Create([FromBody] SysDepartmentCreateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _departments.CreateAsync(
                new CreateDepartmentRequest(request.ParentId, request.Name, request.Code,
                    request.SortOrder, request.Leader, request.Phone, request.IsActive),
                cancellationToken);

            var created = await _departments.GetByIdAsync(id, cancellationToken);
            return created is null
                ? Problem("插入后无法读取部门。")
                : CreatedAtAction(nameof(GetById), new { id }, Result<SysDepartmentDto>.Ok(created.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysDepartmentDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<Result<SysDepartmentDto>>> Update(long id, [FromBody] SysDepartmentUpdateRequest request, CancellationToken cancellationToken)
    {
        var ok = await _departments.UpdateAsync(id,
            new UpdateDepartmentRequest(request.ParentId, request.Name, request.Code,
                request.SortOrder, request.Leader, request.Phone, request.IsActive),
            cancellationToken);

        if (!ok) return NotFound(Result<SysDepartmentDto>.Fail("NotFound"));
        var updated = await _departments.GetByIdAsync(id, cancellationToken);
        return updated is null ? NotFound(Result<SysDepartmentDto>.Fail("NotFound")) : Ok(Result<SysDepartmentDto>.Ok(updated.ToDto()));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        try
        {
            return await _departments.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound(Result.Fail("NotFound"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Result.Fail(ex.Message));
        }
    }
}
