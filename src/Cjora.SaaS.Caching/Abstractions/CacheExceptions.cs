namespace Cjora.SaaS.Caching.Abstractions;

/// <summary>
/// 缓存容量超限异常：单个 Key 的集合（HashMap 字段、Geo 成员等）超过
/// <c>CacheOptions.Memory.*MaxPerKey</c> 且策略配置为 <c>Throw</c> 时抛出。
/// </summary>
/// <remarks>
/// 默认抛出是为了让业务显式感知容量设计问题，而不是静默淘汰导致数据丢失。
/// 接受可淘汰语义时请将 <c>OverflowPolicy</c> 配置为 <c>EvictOldest</c>。
/// </remarks>
public sealed class CacheCapacityExceededException : InvalidOperationException
{
    /// <summary>构造。</summary>
    public CacheCapacityExceededException(string key, int limit)
        : base($"Cache capacity exceeded. Key='{key}', Limit={limit}.")
    {
        Key = key;
        Limit = limit;
    }

    /// <summary>触发超限的缓存 Key。</summary>
    public string Key { get; }

    /// <summary>该 Key 的成员 / 字段上限。</summary>
    public int Limit { get; }
}

/// <summary>
/// 缓存类型不匹配异常：同一 HashMap field 先以类型 A 写入，再以类型 B 读取，
/// 为避免"JSON 形状偶然兼容"造成的静默类型污染，直接抛出。
/// </summary>
public sealed class CacheTypeMismatchException : InvalidOperationException
{
    /// <summary>构造。</summary>
    public CacheTypeMismatchException(string key, string field, string storedType, string requestedType)
        : base($"Cache value type mismatch. Key='{key}', Field='{field}', Stored='{storedType}', Requested='{requestedType}'.")
    {
        Key = key;
        Field = field;
        StoredType = storedType;
        RequestedType = requestedType;
    }

    /// <summary>缓存 Key。</summary>
    public string Key { get; }

    /// <summary>字段名。</summary>
    public string Field { get; }

    /// <summary>存储时记录的类型标签（通常是 <c>Type.FullName</c>）。</summary>
    public string StoredType { get; }

    /// <summary>读取请求的目标类型标签。</summary>
    public string RequestedType { get; }
}
