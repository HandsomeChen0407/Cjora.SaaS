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
/// 锁句柄。<see cref="IAsyncDisposable.DisposeAsync"/> 时自动释放；
/// 长任务应监听 <see cref="LockLost"/>，当续租失败 / 锁已丢失时及时中止。
/// </summary>
public interface ILockHandle : IAsyncDisposable
{
    /// <summary>锁定的 Key。</summary>
    string Key { get; }

    /// <summary>
    /// 锁失效取消令牌：当后台续租检测到锁不再归属本 handle（TTL 过期、手工 DEL、网络分区续租失败）
    /// 时被 Cancel，业务应据此提前退出临界区，避免"自以为持锁、实际已被他人获取"。
    /// </summary>
    /// <remarks>
    /// 不支持续租的实现（如 <c>MemoryLockService</c>）返回 <see cref="CancellationToken.None"/>。
    /// </remarks>
    CancellationToken LockLost => CancellationToken.None;
}
