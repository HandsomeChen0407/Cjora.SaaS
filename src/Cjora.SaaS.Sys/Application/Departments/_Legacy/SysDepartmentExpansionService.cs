using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// <see cref="ISysDepartmentExpansionService"/> 的默认实现。
/// </summary>
public sealed class SysDepartmentExpansionService : ISysDepartmentExpansionService
{
    private readonly IRepository<SysDepartment> _departments;
    private readonly SysDepartmentOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ITenantProvider _tenantProvider;
    private readonly SysSecurityCacheGeneration _generation;
    private readonly SysSecurityCacheOptions _cacheOptions;

    /// <summary>
    /// 初始化 <see cref="SysDepartmentExpansionService"/>。
    /// </summary>
    public SysDepartmentExpansionService(
        IRepository<SysDepartment> departments,
        IOptions<SysDepartmentOptions> options,
        IMemoryCache cache,
        ITenantProvider tenantProvider,
        SysSecurityCacheGeneration generation,
        IOptions<SysSecurityCacheOptions> cacheOptions)
    {
        _departments = departments;
        _options = options.Value;
        _cache = cache;
        _tenantProvider = tenantProvider;
        _generation = generation;
        _cacheOptions = cacheOptions.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ExpandWithDescendantsAsync(long rootDepartmentId, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantProvider.GetTenantId();
        var gen = _generation.Department;
        var cacheKey = $"cjora:dept-all:{tenantId}:{gen}";
        if (!_cache.TryGetValue(cacheKey, out List<SysDepartment>? all))
        {
            all = await _departments.GetListAsync(cancellationToken);
            _cache.Set(
                cacheKey,
                all,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(
                        Math.Clamp(_cacheOptions.AbsoluteExpirationMinutes, 5, 10))
                });
        }

        if (all!.Count > _options.MaxDepartmentNodes)
        {
            throw new InvalidOperationException("Department tree too large. Use alternative model.");
        }

        return SysDepartmentExpansion.ExpandWithDescendants(rootDepartmentId, all);
    }
}
