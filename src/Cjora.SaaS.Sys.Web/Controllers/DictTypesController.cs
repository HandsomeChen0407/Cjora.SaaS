using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Api.Auth;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Dicts;
using Cjora.SaaS.Sys.Application.Dicts.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/dict-types")]
public sealed class DictTypesController : ControllerBase
{
    private readonly IDictAppService _dicts;

    public DictTypesController(IDictAppService dicts)
    {
        _dicts = dicts;
    }

    [HttpGet]
    [AuthorizePermCode("sys:dict-type:list")]
    public async Task<ActionResult<Result<PagedResponse<SysDictTypeDto>>>> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var page = await _dicts.GetTypesPagedAsync(new PagedRequest { PageNumber = pageNumber, PageSize = pageSize }, cancellationToken);
        return Ok(Result<PagedResponse<SysDictTypeDto>>.Ok(new PagedResponse<SysDictTypeDto>
        {
            Items = page.Items.Select(static t => t.ToDto()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        }));
    }

    [HttpGet("{id:long}")]
    [AuthorizePermCode("sys:dict-type:detail")]
    public async Task<ActionResult<Result<SysDictTypeDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var t = await _dicts.GetTypeByIdAsync(id, cancellationToken);
        return t is null ? NotFound(Result<SysDictTypeDto>.Fail("NotFound")) : Ok(Result<SysDictTypeDto>.Ok(t.ToDto()));
    }

    [HttpPost]
    [AuthorizePermCode("sys:dict-type:create")]
    public async Task<ActionResult<Result<SysDictTypeDto>>> Create([FromBody] SysDictTypeCreateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _dicts.CreateTypeAsync(
                new CreateDictTypeRequest(request.Name, request.Code, request.Category,
                    request.Remark, request.IsActive, request.IsLocked),
                cancellationToken);

            var created = await _dicts.GetTypeByIdAsync(id, cancellationToken);
            return created is null
                ? Problem("插入后无法读取字典类型。")
                : CreatedAtAction(nameof(GetById), new { id }, Result<SysDictTypeDto>.Ok(created.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysDictTypeDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    [AuthorizePermCode("sys:dict-type:update")]
    public async Task<ActionResult<Result<SysDictTypeDto>>> Update(long id, [FromBody] SysDictTypeUpdateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var ok = await _dicts.UpdateTypeAsync(id,
                new UpdateDictTypeRequest(request.Name, request.Code, request.Category,
                    request.Remark, request.IsActive, request.IsLocked),
                cancellationToken);

            if (!ok) return NotFound(Result<SysDictTypeDto>.Fail("NotFound"));
            var updated = await _dicts.GetTypeByIdAsync(id, cancellationToken);
            return updated is null ? NotFound(Result<SysDictTypeDto>.Fail("NotFound")) : Ok(Result<SysDictTypeDto>.Ok(updated.ToDto()));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Result<SysDictTypeDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    [AuthorizePermCode("sys:dict-type:delete")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        try
        {
            return await _dicts.DeleteTypeAsync(id, cancellationToken) ? NoContent() : NotFound(Result.Fail("NotFound"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Result.Fail(ex.Message));
        }
    }

    [HttpGet("{typeId:long}/items")]
    [AuthorizePermCode("sys:dict-item:list")]
    public async Task<ActionResult<Result<IReadOnlyList<SysDictItemDto>>>> GetItems(long typeId, CancellationToken cancellationToken)
    {
        var items = await _dicts.GetItemsByTypeAsync(typeId, cancellationToken);
        return Ok(Result<IReadOnlyList<SysDictItemDto>>.Ok(items.Select(static i => i.ToDto()).ToArray()));
    }

    [HttpGet("{typeId:long}/items/{itemId:long}")]
    [AuthorizePermCode("sys:dict-item:detail")]
    public async Task<ActionResult<Result<SysDictItemDto>>> GetItemById(long typeId, long itemId, CancellationToken cancellationToken)
    {
        var i = await _dicts.GetItemByIdAsync(itemId, cancellationToken);
        return i is null ? NotFound(Result<SysDictItemDto>.Fail("NotFound")) : Ok(Result<SysDictItemDto>.Ok(i.ToDto()));
    }

    [HttpPost("{typeId:long}/items")]
    [AuthorizePermCode("sys:dict-item:create")]
    public async Task<ActionResult<Result<SysDictItemDto>>> CreateItem(long typeId, [FromBody] SysDictItemCreateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var id = await _dicts.CreateItemAsync(typeId,
                new CreateDictItemRequest(request.Label, request.Value, request.SortOrder, request.IsActive, request.Remark),
                cancellationToken);

            var created = await _dicts.GetItemByIdAsync(id, cancellationToken);
            return created is null
                ? Problem("插入后无法读取字典项。")
                : CreatedAtAction(nameof(GetItemById), new { typeId, itemId = id }, Result<SysDictItemDto>.Ok(created.ToDto()));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(Result<SysDictItemDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{typeId:long}/items/{itemId:long}")]
    [AuthorizePermCode("sys:dict-item:update")]
    public async Task<ActionResult<Result<SysDictItemDto>>> UpdateItem(long typeId, long itemId, [FromBody] SysDictItemUpdateRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var ok = await _dicts.UpdateItemAsync(itemId,
                new UpdateDictItemRequest(request.Label, request.Value, request.SortOrder, request.IsActive, request.Remark),
                cancellationToken);

            if (!ok) return NotFound(Result<SysDictItemDto>.Fail("NotFound"));
            var updated = await _dicts.GetItemByIdAsync(itemId, cancellationToken);
            return updated is null ? NotFound(Result<SysDictItemDto>.Fail("NotFound")) : Ok(Result<SysDictItemDto>.Ok(updated.ToDto()));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(Result<SysDictItemDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{typeId:long}/items/{itemId:long}")]
    [AuthorizePermCode("sys:dict-item:delete")]
    public async Task<IActionResult> DeleteItem(long typeId, long itemId, CancellationToken cancellationToken)
    {
        try
        {
            return await _dicts.DeleteItemAsync(itemId, cancellationToken) ? NoContent() : NotFound(Result.Fail("NotFound"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(Result.Fail(ex.Message));
        }
    }
}
