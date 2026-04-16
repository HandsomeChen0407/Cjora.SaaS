namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// Hash（字典）结构缓存抽象，对应 Redis HASH 数据类型。
/// Memory 实现使用 ConcurrentDictionary 模拟，Redis 实现映射 HSET / HGET / HDEL / HGETALL / HINCRBY。
/// </summary>
public interface IHashMapService
{
    /// <summary>设置单个字段（HSET）。</summary>
    Task SetFieldAsync<T>(string key, string field, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>批量设置多个字段（HMSET）。</summary>
    Task SetFieldsAsync<T>(string key, IEnumerable<KeyValuePair<string, T>> fields, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>获取单个字段（HGET）。</summary>
    Task<T?> GetFieldAsync<T>(string key, string field, CancellationToken cancellationToken = default);

    /// <summary>获取所有字段与值（HGETALL）。</summary>
    Task<Dictionary<string, T>> GetAllAsync<T>(string key, CancellationToken cancellationToken = default);

    /// <summary>删除一个或多个字段（HDEL）。</summary>
    Task RemoveFieldsAsync(string key, IEnumerable<string> fields, CancellationToken cancellationToken = default);

    /// <summary>判断字段是否存在（HEXISTS）。</summary>
    Task<bool> FieldExistsAsync(string key, string field, CancellationToken cancellationToken = default);

    /// <summary>对字段做原子自增（HINCRBY）。</summary>
    Task<long> IncrementAsync(string key, string field, long value = 1, CancellationToken cancellationToken = default);

    /// <summary>删除整个 Hash Key。</summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
