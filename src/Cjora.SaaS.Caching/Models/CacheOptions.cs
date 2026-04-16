namespace Cjora.SaaS.Caching.Models;

/// <summary>
/// 缓存提供者配置，绑定 <c>appsettings.json</c> 的 <c>Cache</c> 节。
/// </summary>
public sealed class CacheOptions
{
    public const string SectionName = "Cache";

    /// <summary>"Memory" 或 "Redis"。</summary>
    public string Provider { get; set; } = "Memory";

    /// <summary>默认绝对过期时间（分钟），运行时限制在 [5, 10] 区间。</summary>
    public int DefaultExpireMinutes { get; set; } = 7;

    /// <summary>Redis 连接配置（仅 <c>Provider=Redis</c> 时生效）。</summary>
    public RedisCacheOptions Redis { get; set; } = new();
}

/// <summary>Redis 连接选项。</summary>
public sealed class RedisCacheOptions
{
    /// <summary>StackExchange.Redis 连接字符串，例如 <c>localhost:6379</c>。</summary>
    public string Configuration { get; set; } = "localhost:6379";

    /// <summary>Redis 数据库编号。</summary>
    public int Database { get; set; } = 0;
}
