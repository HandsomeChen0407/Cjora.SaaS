using Cjora.SaaS.Core.Repository;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class DictTypesController : ControllerBase
{
    private readonly IRepository<SysDictType> _types;
    private readonly IRepository<SysDictItem> _items;

    public DictTypesController(IRepository<SysDictType> types, IRepository<SysDictItem> items)
    {
        _types = types;
        _items = items;
    }

    [HttpGet]
    public async Task<ActionResult<PagedApiResult<SysDictTypeDto>>> GetPaged(
        [FromQuery] int pageNumber = Cjora.SaaS.Sys.Repository.SysPagedRequestDefaults.DefaultPageNumber,
        [FromQuery] int pageSize = Cjora.SaaS.Sys.Repository.SysPagedRequestDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var req = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var page = await _types.GetPagedListAsync(null, req, t => t.Id, true, cancellationToken);
        return Ok(new PagedApiResult<SysDictTypeDto>
        {
            Items = page.Items.Select(static t => t.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        });
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SysDictTypeDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var t = await _types.GetSingleAsync(x => x.Id == id, cancellationToken);
        return t is null ? NotFound() : Ok(t.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysDictTypeDto>> Create([FromBody] SysDictTypeCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest("Name 与 Code 必填。");
        }

        if (request.Category is not ("system" or "business"))
        {
            return BadRequest("Category 仅支持 system 或 business。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysDictType
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim(),
            Category = request.Category,
            Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim(),
            IsActive = request.IsActive,
            IsLocked = request.IsLocked,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _types.InsertAsync(entity, cancellationToken);
        var created = await _types.GetSingleAsync(x => x.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取字典类型。") : CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SysDictTypeDto>> Update(long id, [FromBody] SysDictTypeUpdateRequest request, CancellationToken cancellationToken)
    {
        var t = await _types.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (t is null)
        {
            return NotFound();
        }

        if (t.IsLocked)
        {
            return BadRequest("系统锁定字典不允许修改。");
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            t.Name = request.Name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            t.Code = request.Code.Trim();
        }

        if (request.Category is not ("system" or "business"))
        {
            return BadRequest("Category 仅支持 system 或 business。");
        }

        t.Category = request.Category;
        t.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
        t.IsActive = request.IsActive;
        t.IsLocked = request.IsLocked;
        t.UpdatedAtUtc = DateTime.UtcNow;

        await _types.UpdateAsync(t, cancellationToken);
        return Ok(t.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var t = await _types.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (t is null)
        {
            return NotFound();
        }

        if (t.IsLocked)
        {
            return BadRequest("系统锁定字典不允许删除。");
        }

        var nItems = await _items.DeleteAsync(x => x.TypeId == id, cancellationToken);
        _ = nItems;

        var n = await _types.DeleteAsync(x => x.Id == id, cancellationToken);
        return n == 0 ? NotFound() : NoContent();
    }
}

