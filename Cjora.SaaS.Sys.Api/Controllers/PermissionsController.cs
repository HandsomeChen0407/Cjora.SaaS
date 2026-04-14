using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class PermissionsController : ControllerBase
{
    private readonly IRepository<SysPermission> _perms;

    public PermissionsController(IRepository<SysPermission> perms)
    {
        _perms = perms;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SysPermissionDto>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _perms.GetListAsync(cancellationToken);
        return Ok(list
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Id)
            .Select(static p => p.ToDto())
            .ToArray());
    }

    [HttpGet("tree")]
    public async Task<ActionResult<IReadOnlyList<SysPermissionTreeNodeDto>>> GetTree(CancellationToken cancellationToken)
    {
        var list = await _perms.GetListAsync(cancellationToken);
        var nodes = list
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Id)
            .Select(static p => p.ToDto())
            .ToArray();

        var childrenByParent = nodes
            .GroupBy(n => n.ParentId)
            .ToDictionary(g => g.Key ?? 0L, g => g.ToArray());

        SysPermissionTreeNodeDto Build(SysPermissionDto dto)
        {
            var children = childrenByParent.TryGetValue(dto.Id, out var kids) ? kids : Array.Empty<SysPermissionDto>();
            return new SysPermissionTreeNodeDto
            {
                Id = dto.Id,
                ParentId = dto.ParentId,
                Label = dto.Label,
                NodeType = dto.NodeType,
                Path = dto.Path,
                HttpMethod = dto.HttpMethod,
                PermCode = dto.PermCode,
                Icon = dto.Icon,
                SortOrder = dto.SortOrder,
                IsVisible = dto.IsVisible,
                IsActive = dto.IsActive,
                Children = children.Select(Build).ToArray()
            };
        }

        var roots = childrenByParent.TryGetValue(0L, out var rootNodes) ? rootNodes : Array.Empty<SysPermissionDto>();
        return Ok(roots.Select(Build).ToArray());
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SysPermissionDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var p = await _perms.GetSingleAsync(x => x.Id == id, cancellationToken);
        return p is null ? NotFound() : Ok(p.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysPermissionDto>> Create([FromBody] SysPermissionCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Label))
        {
            return BadRequest("Label 必填。");
        }

        if (request.NodeType is not ("menu" or "button"))
        {
            return BadRequest("NodeType 仅支持 menu 或 button。");
        }

        if (request.NodeType == "button" && string.IsNullOrWhiteSpace(request.PermCode))
        {
            return BadRequest("button 节点必须提供 PermCode。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysPermission
        {
            ParentId = request.ParentId,
            Label = request.Label.Trim(),
            NodeType = request.NodeType,
            Path = string.IsNullOrWhiteSpace(request.Path) ? null : request.Path.Trim(),
            HttpMethod = string.IsNullOrWhiteSpace(request.HttpMethod) ? null : request.HttpMethod.Trim().ToUpperInvariant(),
            PermCode = string.IsNullOrWhiteSpace(request.PermCode) ? null : request.PermCode.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim(),
            SortOrder = request.SortOrder,
            IsVisible = request.IsVisible,
            IsActive = request.IsActive,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _perms.InsertAsync(entity, cancellationToken);
        var created = await _perms.GetSingleAsync(x => x.Id == entity.Id, cancellationToken);
        return created is null ? Problem("插入后无法读取权限节点。") : CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SysPermissionDto>> Update(long id, [FromBody] SysPermissionUpdateRequest request, CancellationToken cancellationToken)
    {
        var p = await _perms.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (p is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Label))
        {
            p.Label = request.Label.Trim();
        }

        if (request.NodeType is not ("menu" or "button"))
        {
            return BadRequest("NodeType 仅支持 menu 或 button。");
        }

        p.NodeType = request.NodeType;
        p.ParentId = request.ParentId;
        p.Path = string.IsNullOrWhiteSpace(request.Path) ? null : request.Path.Trim();
        p.HttpMethod = string.IsNullOrWhiteSpace(request.HttpMethod) ? null : request.HttpMethod.Trim().ToUpperInvariant();
        p.PermCode = string.IsNullOrWhiteSpace(request.PermCode) ? null : request.PermCode.Trim();
        p.Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim();
        p.SortOrder = request.SortOrder;
        p.IsVisible = request.IsVisible;
        p.IsActive = request.IsActive;
        p.UpdatedAtUtc = DateTime.UtcNow;

        if (p.NodeType == "button" && string.IsNullOrWhiteSpace(p.PermCode))
        {
            return BadRequest("button 节点必须提供 PermCode。");
        }

        await _perms.UpdateAsync(p, cancellationToken);
        return Ok(p.ToDto());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var hasChild = await _perms.GetSingleAsync(x => x.ParentId == id, cancellationToken);
        if (hasChild is not null)
        {
            return BadRequest("含子节点时无法删除。");
        }

        var n = await _perms.DeleteAsync(x => x.Id == id, cancellationToken);
        return n == 0 ? NotFound() : NoContent();
    }
}

