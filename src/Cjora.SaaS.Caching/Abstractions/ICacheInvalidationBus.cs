namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 缓存失效广播总线：跨实例通知"某个缓存 Key 已失效，需要重新加载"。
/// </summary>
/// <remarks>
/// <para>单实例（Memory 模式）下使用进程内事件广播（仅同进程订阅者收到）。</para>
/// <para>多实例（Redis 模式）下使用 Redis Pub/Sub，所有订阅同一 Channel 的实例均能收到失效通知。</para>
/// <para>典型用法：权限变更后调用 <see cref="PublishAsync"/>，各实例订阅后主动清理本地缓存或刷新。</para>
/// </remarks>
public interface ICacheInvalidationBus : IAsyncDisposable
{
    /// <summary>
    /// 发布缓存失效通知。
    /// </summary>
    /// <param name="key">需要失效的缓存 Key 或 Key 模式。</param>
    /// <param name="cancellationToken">取消标记。</param>
    Task PublishAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 订阅缓存失效通知。当收到匹配 <paramref name="pattern"/> 的失效消息时执行回调。
    /// </summary>
    /// <param name="pattern">订阅的 Key 模式（Redis 模式支持通配符 <c>*</c>；Memory 模式做前缀匹配）。</param>
    /// <param name="handler">收到失效通知时的回调（参数为失效的 Key）。</param>
    /// <param name="cancellationToken">取消标记。</param>
    Task SubscribeAsync(string pattern, Func<string, Task> handler, CancellationToken cancellationToken = default);
}
