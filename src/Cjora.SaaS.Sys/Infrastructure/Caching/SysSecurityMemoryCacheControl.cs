namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <inheritdoc />
public sealed class SysSecurityMemoryCacheControl : ISysSecurityMemoryCacheControl
{
    private readonly SysSecurityCacheGeneration _generation;

    public SysSecurityMemoryCacheControl(SysSecurityCacheGeneration generation)
    {
        _generation = generation;
    }

    /// <inheritdoc />
    public void InvalidatePermissionCaches() => _generation.BumpPermission();

    /// <inheritdoc />
    public void InvalidateDataPermissionCaches() => _generation.BumpDataPermission();

    /// <inheritdoc />
    public void InvalidateDepartmentCaches() => _generation.BumpDepartment();
}
