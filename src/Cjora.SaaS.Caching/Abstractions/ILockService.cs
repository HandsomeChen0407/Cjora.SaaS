namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 分布式锁抽象。Memory 实现仅进程内互斥，Redis 实现跨实例互斥。
/// </summary>
public interface ILockService
{
    /// <summary>
    /// 尝试获取锁；成功返回 <see cref="ILockHandle"/>，失败返回 <c>null</c>。
    /// </summary>
    Task<ILockHandle?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken cancellationToken = default);
}

/// <summary>
/// 锁句柄。<see cref="IAsyncDisposable.DisposeAsync"/> 时自动释放。
/// </summary>
public interface ILockHandle : IAsyncDisposable
{
    /// <summary>锁定的 Key。</summary>
    string Key { get; }
}
