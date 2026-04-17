namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 缓存失效广播总线：跨实例通知"某个缓存 Key 已失效"。
/// </summary>
/// <remarks>
/// <para><b>语义严格限定为"观察点"：</b>Bus 只负责把 Key 字符串扇出给订阅者，<b>不会</b>自动调用
/// <see cref="ICachingService"/> 做任何事。是否需要清理 L1 / 刷新配置 / 触发重计算，由订阅者自行决定。</para>
/// <para>本模块<b>不会</b>自我订阅然后自动清缓存——这种设计在共享 Redis 存储场景下会导致"他实例误删刚写入的值"数据丢失 bug，
/// 业务层若有独立的 L1（如本地内存缓存）需要失效，请显式 <see cref="SubscribeAsync"/>。</para>
/// <para><b>一致性定位：</b>Pub/Sub 无持久化，订阅者离线期间消息永久丢失，因此本总线仅是<b>最终一致性加速器</b>。
/// 强一致请采用<b>版本号 Key</b>模式（见 <c>SaaSCacheKeys.Version</c>）+ TTL 兜底。</para>
/// </remarks>
public interface ICacheInvalidationBus : IAsyncDisposable
{
    /// <summary>
    /// 发布缓存失效通知。<paramref name="key"/> 将原封不动地扇出给所有匹配的订阅者。
    /// </summary>
    Task PublishAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 订阅缓存失效通知，返回 <see cref="IAsyncDisposable"/>，Dispose 时取消本订阅。
    /// <para>匹配规则（Memory / Redis 实现统一）：</para>
    /// <list type="bullet">
    ///   <item><description><c>pattern == "*"</c>：匹配全部；</description></item>
    ///   <item><description><c>pattern</c> 以 <c>*</c> 结尾：前缀匹配；</description></item>
    ///   <item><description>其余：精确等于；</description></item>
    ///   <item><description>中缀含 <c>*</c>（如 <c>"a*b"</c>）：<b>抛 <see cref="ArgumentException"/></b>，避免歧义。</description></item>
    /// </list>
    /// </summary>
    /// <param name="pattern">订阅模式。</param>
    /// <param name="handler">收到失效通知时的回调（参数为完整 Key）。回调中应只做轻量操作，避免阻塞 Redis Pub/Sub 接收线程。</param>
    /// <param name="cancellationToken">取消标记（仅作用于订阅建立阶段）。</param>
    Task<IAsyncDisposable> SubscribeAsync(string pattern, Func<string, Task> handler, CancellationToken cancellationToken = default);
}
