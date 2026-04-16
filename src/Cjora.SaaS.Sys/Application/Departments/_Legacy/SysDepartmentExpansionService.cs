using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Microsoft.Extensions.Options;
using SqlSugar;

namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// <see cref="ISysDepartmentExpansionService"/> 的默认实现。
/// </summary>
public sealed class SysDepartmentExpansionService : ISysDepartmentExpansionService
{
    private const string Module = "sys";
    private readonly SysDepartmentOptions _options;
    private readonly ISqlSugarClient _db;
    private readonly ICachingService _cache;
    private readonly ILockService _lock;
    private readonly ITenantProvider _tenantProvider;
    private readonly SysSecurityCacheVersionStore _versions;
    private readonly CacheOptions _cacheOptions;

    /// <summary>
    /// 初始化 <see cref="SysDepartmentExpansionService"/>。
    /// </summary>
    public SysDepartmentExpansionService(
        IOptions<SysDepartmentOptions> options,
        ISqlSugarClient db,
        ICachingService cache,
        ILockService @lock,
        ITenantProvider tenantProvider,
        SysSecurityCacheVersionStore versions,
        IOptions<CacheOptions> cacheOptions)
    {
        _options = options.Value;
        _db = db;
        _cache = cache;
        _lock = @lock;
        _tenantProvider = tenantProvider;
        _versions = versions;
        _cacheOptions = cacheOptions.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ExpandWithDescendantsAsync(long rootDepartmentId, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantProvider.GetTenantId();
        var ver = await _versions.GetDepartmentVersionAsync(cancellationToken).ConfigureAwait(false);
        var cacheKey = SaaSCacheKeys.DepartmentClosure(Module, tenantId, rootDepartmentId, ver);

        var cached = await _cache.GetAsync<long[]>(cacheKey).ConfigureAwait(false);
        if (cached is not null)
        {
            return cached;
        }

        var lockKey = SaaSCacheKeys.Lock(Module, "dept-closure", $"{tenantId}:{rootDepartmentId}");
        var handle = await _lock.TryAcquireAsync(lockKey, TimeSpan.FromSeconds(5), cancellationToken).ConfigureAwait(false);
        if (handle is not null)
        {
            await using (handle.ConfigureAwait(false))
            {
                cached = await _cache.GetAsync<long[]>(cacheKey).ConfigureAwait(false);
                if (cached is not null)
                {
                    return cached;
                }

                var listLocked = await _db.Queryable<SysDepartmentClosure>()
                    .Where(c => c.TenantId == tenantId && c.AncestorId == rootDepartmentId)
                    .Select(c => c.DescendantId)
                    .ToListAsync(cancellationToken)
                    .ConfigureAwait(false);

                if (listLocked.Count > _options.MaxDepartmentNodes)
                {
                    throw new InvalidOperationException("Department tree too large. Use alternative model.");
                }

                var resultLocked = listLocked.Distinct().ToArray();
                await _cache.SetAsync(
                        cacheKey,
                        resultLocked,
                        TimeSpan.FromMinutes(Math.Clamp(_cacheOptions.DefaultExpireMinutes, 5, 10)))
                    .ConfigureAwait(false);
                return resultLocked;
            }
        }

        var list = await _db.Queryable<SysDepartmentClosure>()
            .Where(c => c.TenantId == tenantId && c.AncestorId == rootDepartmentId)
            .Select(c => c.DescendantId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (list.Count > _options.MaxDepartmentNodes)
        {
            throw new InvalidOperationException("Department tree too large. Use alternative model.");
        }

        var result = list.Distinct().ToArray();
        await _cache.SetAsync(
                cacheKey,
                result,
                TimeSpan.FromMinutes(Math.Clamp(_cacheOptions.DefaultExpireMinutes, 5, 10)))
            .ConfigureAwait(false);
        return result;
    }
}
