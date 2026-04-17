using Cjora.SaaS.Caching.Models;

namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 统一缓存使用入口（推荐业务注入）。
/// </summary>
/// <remarks>
/// <para>相较底层 <see cref="ICachingService"/>，额外提供：</para>
/// <list type="bullet">
///   <item><description>强制以 <see cref="CacheKey"/> 驱动，经 <see cref="SaaSCacheKeys"/> 生成，保障 Key 体系一致；</description></item>
///   <item><description>按 <see cref="CacheKey.Module"/> 维度解析 TTL（<c>CacheOptions.ModuleExpireMinutes</c>）；</description></item>
///   <item><description>与 <see cref="ICacheInvalidationBus"/> 解耦——写入不会偷偷广播，
///   <see cref="RemoveAsync"/> 在删除后主动发布失效给外部 L1 观察者，
///   <see cref="InvalidateAsync"/> 是纯广播。</description></item>
/// </list>
/// <para><b>一致性模型：</b>本模块不做"写入 → 广播 → 他实例自清"的自动闭环——在 Redis 共享存储场景下
/// 那会把刚写入的值误删。强一致请搭配版本号 Key（写入 = Bump 版本，旧 Key 自然过期），
/// Bus 仅作为外部 L1 缓存的"最终一致性加速器"。</para>
/// </remarks>
public interface ICacheManager
{
    /// <summary>按 <see cref="CacheKey"/> 获取缓存值；不存在返回 <c>default</c>。</summary>
    Task<T?> GetAsync<T>(CacheKey key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 写入缓存。<paramref name="expire"/> 为 <c>null</c> 时依次尝试
    /// <c>CacheOptions.ModuleExpireMinutes[key.Module]</c>、<c>CacheOptions.DefaultExpireMinutes</c>。
    /// <b>不会</b>自动向 <see cref="ICacheInvalidationBus"/> 广播。
    /// </summary>
    Task SetAsync<T>(CacheKey key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// 仅当 Key 不存在时写入，成功返回 <c>true</c>。映射底层 <c>SetIfAbsentAsync</c>（Redis 原子，Memory 近似）。
    /// </summary>
    Task<bool> SetIfAbsentAsync<T>(CacheKey key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>查询剩余 TTL；不存在或实现不支持返回 <c>null</c>。</summary>
    Task<TimeSpan?> GetTtlAsync(CacheKey key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 删除指定 Key。删除后会自动 <see cref="InvalidateAsync"/>，用于通知外部 L1 观察者；
    /// 如果希望"静默删除"，请改用 <see cref="ICachingService.RemoveAsync"/>。
    /// </summary>
    Task RemoveAsync(CacheKey key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 仅广播失效通知（不触碰底层存储），用于"版本号 Bump 已完成，请通知观察者"等场景。
    /// </summary>
    Task InvalidateAsync(CacheKey key, CancellationToken cancellationToken = default);
}
