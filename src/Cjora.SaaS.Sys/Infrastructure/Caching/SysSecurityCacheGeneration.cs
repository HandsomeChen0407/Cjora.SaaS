using System.Threading;

namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <summary>
/// 通过世代号使缓存键失效（避免 MemoryCache 无法按前缀批量移除）。
/// </summary>
public sealed class SysSecurityCacheGeneration
{
    private int _permission;
    private int _department;
    private int _dataPermission;

    public int Permission => Volatile.Read(ref _permission);

    public int Department => Volatile.Read(ref _department);

    public int DataPermission => Volatile.Read(ref _dataPermission);

    public int BumpPermission() => Interlocked.Increment(ref _permission);

    public int BumpDepartment() => Interlocked.Increment(ref _department);

    public int BumpDataPermission() => Interlocked.Increment(ref _dataPermission);
}
