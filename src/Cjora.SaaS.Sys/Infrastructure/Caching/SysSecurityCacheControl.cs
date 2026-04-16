namespace Cjora.SaaS.Sys.Infrastructure.Caching;

public sealed class SysSecurityCacheControl : ISysSecurityCacheControl
{
    private readonly SysSecurityCacheVersionStore _versions;

    public SysSecurityCacheControl(SysSecurityCacheVersionStore versions)
    {
        _versions = versions;
    }

    public Task InvalidatePermissionCachesAsync(CancellationToken cancellationToken = default)
        => _versions.BumpPermissionVersionAsync(cancellationToken);

    public Task InvalidateDataPermissionCachesAsync(CancellationToken cancellationToken = default)
        => _versions.BumpDataPermissionVersionAsync(cancellationToken);

    public Task InvalidateDepartmentCachesAsync(CancellationToken cancellationToken = default)
        => _versions.BumpDepartmentVersionAsync(cancellationToken);
}

