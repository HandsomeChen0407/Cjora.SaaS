using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TenantsController : ControllerBase
{
    private readonly ISysTenantRepository _tenants;

    public TenantsController(ISysTenantRepository tenants)
    {
        _tenants = tenants;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SysTenantDto>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _tenants.GetAllAsync(cancellationToken);
        return Ok(list.Select(static t => t.ToDto()).ToArray());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SysTenantDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var t = await _tenants.GetByIdAsync(id, cancellationToken);
        return t is null ? NotFound() : Ok(t.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<SysTenantDto>> Create([FromBody] SysTenantCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Id) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Id 与 Name 必填。");
        }

        var now = DateTime.UtcNow;
        var entity = new SysTenant
        {
            Id = request.Id.Trim(),
            Name = request.Name.Trim(),
            IsActive = request.IsActive,
            DedicatedDatabaseConnectionString = string.IsNullOrWhiteSpace(request.DedicatedDatabaseConnectionString)
                ? null
                : request.DedicatedDatabaseConnectionString.Trim(),
            CreatedAtUtc = now
        };

        await _tenants.InsertAsync(entity, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity.ToDto());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SysTenantDto>> Update(string id, [FromBody] SysTenantUpdateRequest request, CancellationToken cancellationToken)
    {
        var t = await _tenants.GetByIdAsync(id, cancellationToken);
        if (t is null)
        {
            return NotFound();
        }

        t.Name = string.IsNullOrWhiteSpace(request.Name) ? t.Name : request.Name.Trim();
        t.IsActive = request.IsActive;
        if (request.DedicatedDatabaseConnectionString is not null)
        {
            t.DedicatedDatabaseConnectionString = string.IsNullOrWhiteSpace(request.DedicatedDatabaseConnectionString)
                ? null
                : request.DedicatedDatabaseConnectionString.Trim();
        }

        t.UpdatedAtUtc = DateTime.UtcNow;
        await _tenants.UpdateAsync(t, cancellationToken);
        return Ok(t.ToDto());
    }
}
