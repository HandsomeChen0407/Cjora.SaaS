using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Api.Mapping;
using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize]
public sealed class TenantsController : ControllerBase
{
    private readonly ISysTenantRepository _tenants;

    public TenantsController(ISysTenantRepository tenants)
    {
        _tenants = tenants;
    }

    [HttpGet]
    public async Task<ActionResult<Result<IReadOnlyList<SysTenantDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _tenants.GetAllAsync(cancellationToken);
        return Ok(Result<IReadOnlyList<SysTenantDto>>.Ok(list.Select(static t => t.ToDto()).ToArray()));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Result<SysTenantDto>>> GetById(string id, CancellationToken cancellationToken)
    {
        var t = await _tenants.GetByIdAsync(id, cancellationToken);
        return t is null ? NotFound(Result<SysTenantDto>.Fail("NotFound")) : Ok(Result<SysTenantDto>.Ok(t.ToDto()));
    }

    [HttpPost]
    public async Task<ActionResult<Result<SysTenantDto>>> Create([FromBody] SysTenantCreateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Id) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(Result<SysTenantDto>.Fail("Id 与 Name 必填。"));

        var entity = new SysTenant
        {
            Id = request.Id.Trim(),
            Name = request.Name.Trim(),
            IsActive = request.IsActive,
            DedicatedDatabaseConnectionString = string.IsNullOrWhiteSpace(request.DedicatedDatabaseConnectionString)
                ? null : request.DedicatedDatabaseConnectionString.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _tenants.InsertAsync(entity, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, Result<SysTenantDto>.Ok(entity.ToDto()));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Result<SysTenantDto>>> Update(string id, [FromBody] SysTenantUpdateRequest request, CancellationToken cancellationToken)
    {
        var t = await _tenants.GetByIdAsync(id, cancellationToken);
        if (t is null) return NotFound(Result<SysTenantDto>.Fail("NotFound"));

        t.Name = string.IsNullOrWhiteSpace(request.Name) ? t.Name : request.Name.Trim();
        t.IsActive = request.IsActive;
        if (request.DedicatedDatabaseConnectionString is not null)
        {
            t.DedicatedDatabaseConnectionString = string.IsNullOrWhiteSpace(request.DedicatedDatabaseConnectionString)
                ? null : request.DedicatedDatabaseConnectionString.Trim();
        }
        t.UpdatedAtUtc = DateTime.UtcNow;
        await _tenants.UpdateAsync(t, cancellationToken);
        return Ok(Result<SysTenantDto>.Ok(t.ToDto()));
    }
}
