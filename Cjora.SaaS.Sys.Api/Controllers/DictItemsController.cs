using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class DictItemsController : ControllerBase
{
    private readonly IRepository<SysDictItem> _items;
    private readonly IRepository<SysDictType> _types;

    public DictItemsController(IRepository<SysDictItem> items, IRepository<SysDictType> types)
    {
        _items = items;
        _types = types;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SysDictItemDto>>> GetByType(
        [FromQuery] long typeId,
        CancellationToken cancellationToken)
    {
        if (typeId <= 0)
        {
            return BadRequest("typeId 必填。");
        }

        var list = await _items.GetListAsync(i => i.TypeId == typeId, cancellationToken);
        return Ok(list
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.Id)
            .Select(static i => i.ToDto())
            .ToArray());
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SysDictItemDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var i = await _items.GetSingleAsync(x => x.Id == id, cancellationToken);
        return i is null ? NotFound() : Ok(i.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysDictItemDto>> Create([FromBody] SysDictItemCreateRequest request, CancellationToken cancellationToken)
    {
        if (request.TypeId <= 0)
        {
            return BadRequest("TypeId 必填。");
        }

        if (string.IsNullOrWhiteSpace(request.Label) || string.IsNullOrWhiteSpace(request.Value))
        {
            return BadRequest("Label 与 Value 必填。");
        }

        var type = await _types.GetSingleAsync(t => t.Id == request.TypeId, cancellationToken);
        if (type is null)
        {
            return BadRequest("字典类型不存在。");
        }

        if (type.IsLocked)
        {
            return BadRequest("系统锁定字典不允许新增字典项。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysDictItem
        {
            TypeId = request.TypeId,
            Label = request.Label.Trim(),
            Value = request.Value.Trim(),
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim(),
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _items.InsertAsync(entity, cancellationToken);
        var created = await _items.GetSingleAsync(x => x.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取字典项。") : CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SysDictItemDto>> Update(long id, [FromBody] SysDictItemUpdateRequest request, CancellationToken cancellationToken)
    {
        var i = await _items.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (i is null)
        {
            return NotFound();
        }

        var type = await _types.GetSingleAsync(t => t.Id == i.TypeId, cancellationToken);
        if (type?.IsLocked == true)
        {
            return BadRequest("系统锁定字典不允许修改字典项。");
        }

        if (request.TypeId <= 0)
        {
            return BadRequest("TypeId 必填。");
        }

        if (string.IsNullOrWhiteSpace(request.Label) || string.IsNullOrWhiteSpace(request.Value))
        {
            return BadRequest("Label 与 Value 必填。");
        }

        if (request.TypeId != i.TypeId)
        {
            var newType = await _types.GetSingleAsync(t => t.Id == request.TypeId, cancellationToken);
            if (newType is null)
            {
                return BadRequest("字典类型不存在。");
            }

            if (newType.IsLocked)
            {
                return BadRequest("系统锁定字典不允许调整字典项归属。");
            }
        }

        i.TypeId = request.TypeId;
        i.Label = request.Label.Trim();
        i.Value = request.Value.Trim();
        i.SortOrder = request.SortOrder;
        i.IsActive = request.IsActive;
        i.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
        i.UpdatedAtUtc = DateTime.UtcNow;

        await _items.UpdateAsync(i, cancellationToken);
        return Ok(i.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var i = await _items.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (i is null) return NotFound();

        var type = await _types.GetSingleAsync(t => t.Id == i.TypeId, cancellationToken);
        if (type?.IsLocked == true) return BadRequest("系统锁定字典不允许删除字典项。");

        await _items.DeleteAsync(x => x.Id == id, cancellationToken);
        return NoContent();
    }
}
