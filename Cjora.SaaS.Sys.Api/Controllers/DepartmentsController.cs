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
public sealed class DepartmentsController : ControllerBase
{
    private readonly IRepository<SysDepartment> _departments;

    public DepartmentsController(IRepository<SysDepartment> departments)
    {
        _departments = departments;
    }

    [HttpGet]
    public async Task<ActionResult<PagedApiResult<SysDepartmentDto>>> GetPaged(
        [FromQuery] int pageNumber = SysPagedRequestDefaults.DefaultPageNumber,
        [FromQuery] int pageSize = SysPagedRequestDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var req = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var page = await _departments.GetPagedListAsync(null, req, d => d.SortOrder, true, cancellationToken);
        return Ok(new PagedApiResult<SysDepartmentDto>
        {
            Items = page.Items.Select(static d => d.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        });
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SysDepartmentDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var d = await _departments.GetSingleAsync(x => x.Id == id, cancellationToken);
        return d is null ? NotFound() : Ok(d.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysDepartmentDto>> Create([FromBody] SysDepartmentCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name 必填。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysDepartment
        {
            ParentId = request.ParentId,
            Name = request.Name.Trim(),
            Code = request.Code,
            SortOrder = request.SortOrder,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _departments.InsertAsync(entity, cancellationToken);
        var created = await _departments.GetSingleAsync(d => d.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取部门。") : CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SysDepartmentDto>> Update(long id, [FromBody] SysDepartmentUpdateRequest request, CancellationToken cancellationToken)
    {
        var d = await _departments.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (d is null)
        {
            return NotFound();
        }

        d.ParentId = request.ParentId;
        d.Name = string.IsNullOrWhiteSpace(request.Name) ? d.Name : request.Name.Trim();
        d.Code = request.Code;
        d.SortOrder = request.SortOrder;
        d.UpdatedAtUtc = DateTime.UtcNow;
        await _departments.UpdateAsync(d, cancellationToken);
        return Ok(d.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var n = await _departments.DeleteAsync(d => d.Id == id, cancellationToken);
        return n == 0 ? NotFound() : NoContent();
    }
}
