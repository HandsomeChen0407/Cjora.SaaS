namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 键值缓存抽象（命名为 Caching 而非 Cache 以避免与 <c>SqlSugar.ICacheService</c> 冲突）。
/// 由 <c>AddCjoraCaching</c> 根据配置注入 Memory 或 Redis 实现。
/// </summary>
public interface ICachingService
{
    /// <summary>按 Key 获取缓存值；不存在则返回 <c>default</c>。</summary>
    Task<T?> GetAsync<T>(string key);

    /// <summary>写入缓存。<paramref name="expire"/> 为 <c>null</c> 时使用全局默认过期。</summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expire = null);

    /// <summary>删除指定 Key。</summary>
    Task RemoveAsync(string key);
}
