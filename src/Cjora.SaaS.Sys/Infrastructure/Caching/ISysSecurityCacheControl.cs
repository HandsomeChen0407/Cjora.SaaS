namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <summary>
/// 手动失效权限相关缓存（Memory/Redis 透明）。
/// </summary>
public interface ISysSecurityCacheControl
{
    Task InvalidatePermissionCachesAsync(CancellationToken cancellationToken = default);

    Task InvalidateDataPermissionCachesAsync(CancellationToken cancellationToken = default);

    Task InvalidateDepartmentCachesAsync(CancellationToken cancellationToken = default);
}

