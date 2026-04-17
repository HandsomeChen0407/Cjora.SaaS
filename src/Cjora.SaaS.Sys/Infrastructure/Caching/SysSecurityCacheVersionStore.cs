using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;

namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <summary>
/// 缓存版本号存储：通过“版本 key”使缓存键失效（适用于多实例/分布式）。
/// </summary>
/// <remarks>
/// <para><b>实现要点：</b>Bump 使用 <see cref="IHashMapService.IncrementAsync"/>
/// 做<b>单调递增</b>（Redis <c>HINCRBY</c> / Memory 线程安全 Increment）：</para>
/// <list type="bullet">
///   <item><description>原子递增避免 Get-Set 在 Bump 与 GetOrInit 并发时互相覆盖（旧实现基于 <c>SetAsync(UnixMs)</c> 会把 Bump 写入的时间戳覆盖回 "0"）。</description></item>
///   <item><description>基于计数器而非时间戳，规避机房时钟不同步（NTP 漂移）导致"新 Bump 数值反而比旧 Bump 小"的版本号倒退。</description></item>
/// </list>
/// <para><b>存储布局：</b>每个 scope 一个 hash key <c>saas:sys:ver:{scope}</c>，field = <c>tenantId</c>，value = 递增计数器。</para>
/// </remarks>
public sealed class SysSecurityCacheVersionStore
{
    private const string HashKeyPermission = "saas:sys:ver:perm";
    private const string HashKeyDataPermission = "saas:sys:ver:scope";
    private const string HashKeyDepartment = "saas:sys:ver:dept";

    private static readonly TimeSpan VersionRetention = TimeSpan.FromDays(30);

    private readonly IHashMapService _hash;
    private readonly ITenantProvider _tenantProvider;

    /// <summary>DI 构造。</summary>
    public SysSecurityCacheVersionStore(IHashMapService hash, ITenantProvider tenantProvider)
    {
        _hash = hash;
        _tenantProvider = tenantProvider;
    }

    /// <summary>获取当前租户的权限码缓存版本号（不存在则为 "0"）。</summary>
    public Task<string> GetPermissionVersionAsync(CancellationToken cancellationToken = default)
        => GetVersionAsync(HashKeyPermission, cancellationToken);

    /// <summary>获取当前租户的数据权限缓存版本号（不存在则为 "0"）。</summary>
    public Task<string> GetDataPermissionVersionAsync(CancellationToken cancellationToken = default)
        => GetVersionAsync(HashKeyDataPermission, cancellationToken);

    /// <summary>获取当前租户的部门缓存版本号（不存在则为 "0"）。</summary>
    public Task<string> GetDepartmentVersionAsync(CancellationToken cancellationToken = default)
        => GetVersionAsync(HashKeyDepartment, cancellationToken);

    /// <summary>原子递增当前租户的权限码缓存版本号。</summary>
    public Task BumpPermissionVersionAsync(CancellationToken cancellationToken = default)
        => BumpAsync(HashKeyPermission, cancellationToken);

    /// <summary>原子递增当前租户的数据权限缓存版本号。</summary>
    public Task BumpDataPermissionVersionAsync(CancellationToken cancellationToken = default)
        => BumpAsync(HashKeyDataPermission, cancellationToken);

    /// <summary>原子递增当前租户的部门缓存版本号。</summary>
    public Task BumpDepartmentVersionAsync(CancellationToken cancellationToken = default)
        => BumpAsync(HashKeyDepartment, cancellationToken);

    private async Task<string> GetVersionAsync(string hashKey, CancellationToken cancellationToken)
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (string.IsNullOrEmpty(tenantId))
            return "0";

        var v = await _hash.GetFieldAsync<long>(hashKey, tenantId, cancellationToken).ConfigureAwait(false);
        return v.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }

    private async Task BumpAsync(string hashKey, CancellationToken cancellationToken)
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (string.IsNullOrEmpty(tenantId))
            return;

        // IncrementAsync 是原子操作（Redis 原子 Lua / Memory 线程安全），天然单调，
        // 且不依赖客户端本地时钟 —— 规避了旧版 UnixMs 在时钟回拨 / 多机钟差下的版本号倒退。
        // 30 天 TTL 只在 Key 首次创建时生效（ExpireWhen.HasNoExpiry）；
        // 避免版本 key 因 Idle 被驱逐后计数器回到 0 与历史数据版本号冲突的幽灵命中。
        await _hash.IncrementAsync(hashKey, tenantId, 1, VersionRetention, cancellationToken).ConfigureAwait(false);
    }
}
