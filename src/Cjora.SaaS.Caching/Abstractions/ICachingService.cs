namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 低层键值缓存抽象（命名为 Caching 而非 Cache 以避免与 <c>SqlSugar.ICacheService</c> 冲突）。
/// </summary>
/// <remarks>
/// <para><b>架构定位：</b>"缓存存储端口"，由 <c>AddCjoraCaching</c> 按配置注入 Memory 或 Redis 实现。</para>
/// <para><b>业务优先注入 <see cref="ICacheManager"/></b>：
/// <see cref="ICacheManager"/> 在此基础上叠加强类型 <see cref="Models.CacheKey"/>、按模块 TTL、
/// 显式失效广播等能力。直接用 <see cref="ICachingService"/> 将绕过这些保障，仅限框架内部或迁移过渡期。</para>
/// </remarks>
public interface ICachingService
{
    /// <summary>按 Key 获取缓存值；不存在 / 反序列化失败时返回 <c>default</c>。</summary>
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    /// <summary>写入缓存。<paramref name="expire"/> 为 <c>null</c> 时使用全局默认过期。</summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>删除指定 Key。</summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 仅当 Key 不存在时写入（SET NX），成功返回 <c>true</c>。
    /// </summary>
    /// <remarks>
    /// 必须由实现提供：Redis 使用原子 <c>SET NX PX</c>；Memory 使用私有锁保证进程内原子。
    /// <b>禁止以 "GetAsync + SetAsync" 的方式兜底</b>——显式存入 <c>null</c> 值会被误判为"不存在"从而覆盖。
    /// </remarks>
    Task<bool> SetIfAbsentAsync<T>(string key, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// 查询剩余 TTL；返回 <c>null</c> 仅代表 Key 不存在。
    /// 实现不支持 TTL 回读时应返回 <see cref="TtlResult.Unsupported"/>。
    /// </summary>
    /// <remarks>
    /// 为消除"<c>null</c> 同时代表两种语义"的歧义，新代码推荐使用 <see cref="GetTtlResultAsync"/>；
    /// <c>GetTtlAsync</c> 为兼容保留。
    /// </remarks>
    Task<TimeSpan?> GetTtlAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// 查询 TTL，结果区分三态：<c>KeyNotExists</c> / <c>Unsupported</c> / <c>Value</c>。
    /// </summary>
    Task<TtlResult> GetTtlResultAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>判断 Key 是否存在（不触发值反序列化）。</summary>
    Task<bool> KeyExistsAsync(string key, CancellationToken cancellationToken = default);
}

/// <summary>TTL 查询的三态结果：消除 <c>TimeSpan?</c> 的歧义。</summary>
public readonly record struct TtlResult(TtlResultKind Kind, TimeSpan? Value)
{
    /// <summary>Key 不存在。</summary>
    public static readonly TtlResult KeyNotExists = new(TtlResultKind.KeyNotExists, null);

    /// <summary>实现不支持 TTL 回读（例如 Memory）。</summary>
    public static readonly TtlResult Unsupported = new(TtlResultKind.Unsupported, null);

    /// <summary>存在且无过期（Redis PERSIST / 永久 key）。</summary>
    public static readonly TtlResult NoExpiry = new(TtlResultKind.NoExpiry, null);

    /// <summary>存在且带剩余 TTL。</summary>
    public static TtlResult FromValue(TimeSpan ttl) => new(TtlResultKind.HasExpiry, ttl);
}

/// <summary>TTL 查询状态枚举。</summary>
public enum TtlResultKind
{
    /// <summary>Key 不存在。</summary>
    KeyNotExists = 0,

    /// <summary>实现不支持 TTL 回读。</summary>
    Unsupported = 1,

    /// <summary>Key 存在但没有过期。</summary>
    NoExpiry = 2,

    /// <summary>Key 存在且有剩余 TTL。</summary>
    HasExpiry = 3,
}
