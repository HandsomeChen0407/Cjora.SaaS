namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// Hash（字典）结构缓存抽象，对应 Redis HASH 数据类型。
/// Memory 实现使用自维护 <c>ConcurrentDictionary</c>，Redis 实现映射 HSET / HGET / HDEL / HGETALL / HINCRBY。
/// </summary>
public interface IHashMapService
{
    /// <summary>设置单个字段（HSET）。</summary>
    Task SetFieldAsync<T>(string key, string field, T value, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>批量设置多个字段（HMSET）。</summary>
    Task SetFieldsAsync<T>(string key, IEnumerable<KeyValuePair<string, T>> fields, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>获取单个字段（HGET）。</summary>
    Task<T?> GetFieldAsync<T>(string key, string field, CancellationToken cancellationToken = default);

    /// <summary>
    /// 获取所有字段与值（HGETALL）。
    /// <para><b>保留 null 语义：</b>若字段显式存了 <c>null</c> 或反序列化得到 <c>default</c>，仍会作为条目返回，
    /// 调用方拿到的字典大小与 Redis 侧 HKEYS 一致，不会静默丢失。</para>
    /// </summary>
    Task<Dictionary<string, T?>> GetAllAsync<T>(string key, CancellationToken cancellationToken = default);

    /// <summary>删除一个或多个字段（HDEL）。</summary>
    Task RemoveFieldsAsync(string key, IEnumerable<string> fields, CancellationToken cancellationToken = default);

    /// <summary>判断字段是否存在（HEXISTS）。</summary>
    Task<bool> FieldExistsAsync(string key, string field, CancellationToken cancellationToken = default);

    /// <summary>
    /// 对字段做原子自增（HINCRBY 语义）。
    /// <para><b>溢出保护：</b>当 <paramref name="value"/> 或现值超过 <c>2^53-1</c>（JavaScript / Redis Lua 的 double 精度边界）
    /// 时，Memory 实现会抛 <see cref="OverflowException"/>，Redis Lua 会返回 <c>ERR</c> 由客户端转换为 <see cref="InvalidOperationException"/>，
    /// 杜绝"看起来递增成功但数值已失真"。</para>
    /// <para><b>TTL：</b>可选，仅在 Key 首次创建时生效（与 <c>ExpireWhen.HasNoExpiry</c> 对齐）；
    /// 版本号 / 序列号这类长期存活键应显式传入 30 天等长 TTL。</para>
    /// </summary>
    Task<long> IncrementAsync(string key, string field, long value = 1, TimeSpan? expire = null, CancellationToken cancellationToken = default);

    /// <summary>删除整个 Hash Key。</summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
