using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Models;

/// <summary>
/// 缓存提供者配置，绑定 <c>appsettings.json</c> 的 <c>Cache</c> 节。
/// </summary>
public sealed class CacheOptions
{
    /// <summary>配置节名。</summary>
    public const string SectionName = "Cache";

    /// <summary>TTL 最小分钟数（全局硬下限）。</summary>
    public const int MinExpireMinutes = 1;

    /// <summary>TTL 最大分钟数（全局硬上限，= 24 小时）。</summary>
    public const int MaxExpireMinutes = 60 * 24;

    /// <summary>"Memory" 或 "Redis"。</summary>
    public string Provider { get; set; } = "Memory";

    /// <summary>默认绝对过期时间（分钟），有效范围 <see cref="MinExpireMinutes"/>..<see cref="MaxExpireMinutes"/>。</summary>
    public int DefaultExpireMinutes { get; set; } = 7;

    /// <summary>
    /// 按业务模块维度定义的 TTL 覆盖（单位：分钟）。
    /// <para>Key 为 <see cref="CacheKey.Module"/>，使用 <see cref="StringComparer.Ordinal"/> 严格匹配，与 <see cref="CacheKey"/> 强约束的小写语义对齐，避免"大小写不一致但匹配成功 → 换比较器后静默失效"。</para>
    /// </summary>
    public Dictionary<string, int> ModuleExpireMinutes { get; set; } = new(StringComparer.Ordinal);

    /// <summary>
    /// 全局 Key 前缀；为空则不附加（默认）。多环境 / 多租户共享 Redis 时通过此前缀隔离。
    /// <para>只做"存储前缀"，不参与 <see cref="CacheKey"/> 规则校验。</para>
    /// </summary>
    public string KeyPrefix { get; set; } = string.Empty;

    /// <summary>Memory 实现相关配置。</summary>
    public MemoryCacheLimitsOptions Memory { get; set; } = new();

    /// <summary>分布式锁配置。</summary>
    public LockOptions Lock { get; set; } = new();

    /// <summary>Redis 连接配置（仅 <c>Provider=Redis</c> 时生效）。</summary>
    public RedisCacheOptions Redis { get; set; } = new();

    /// <summary>按模块解析 TTL：优先 <see cref="ModuleExpireMinutes"/>，回退 <see cref="DefaultExpireMinutes"/>，最终夹紧到合法区间。</summary>
    public TimeSpan ResolveTtl(string module)
    {
        var minutes = !string.IsNullOrEmpty(module) && ModuleExpireMinutes.TryGetValue(module, out var m)
            ? m
            : DefaultExpireMinutes;

        return TimeSpan.FromMinutes(Math.Clamp(minutes, MinExpireMinutes, MaxExpireMinutes));
    }

    /// <summary>将任意 TTL 夹紧到合法区间（专供内部统一降级使用）。</summary>
    public static TimeSpan ClampTtl(TimeSpan ttl)
    {
        var minutes = ttl.TotalMinutes;
        if (double.IsNaN(minutes) || minutes <= 0)
            return TimeSpan.FromMinutes(MinExpireMinutes);
        if (minutes > MaxExpireMinutes)
            return TimeSpan.FromMinutes(MaxExpireMinutes);
        return ttl;
    }

    /// <summary>应用 <see cref="KeyPrefix"/>：空前缀返回原值，否则 <c>{prefix}:{key}</c>。</summary>
    public string ApplyKeyPrefix(string key)
    {
        if (string.IsNullOrEmpty(KeyPrefix) || string.IsNullOrEmpty(key))
            return key;
        return $"{KeyPrefix}:{key}";
    }
}

/// <summary>Memory 实现的资源上限 / 溢出策略配置。</summary>
public sealed class MemoryCacheLimitsOptions
{
    /// <summary>
    /// <see cref="Abstractions.IGeoService"/> Memory 实现：单个 Key 下最多保留的成员数。
    /// </summary>
    public int GeoMaxMembersPerKey { get; set; } = 10_000;

    /// <summary>
    /// <see cref="Abstractions.IHashMapService"/> Memory 实现：单个 Key 下最多保留的字段数。
    /// </summary>
    public int HashMapMaxFieldsPerKey { get; set; } = 10_000;

    /// <summary>
    /// 超限时的行为。默认 <see cref="OverflowPolicy.Throw"/>——宁可失败也不静默丢数据，
    /// 真正接受淘汰语义时显式改为 <see cref="OverflowPolicy.EvictOldest"/>。
    /// </summary>
    public OverflowPolicy OverflowPolicy { get; set; } = OverflowPolicy.Throw;
}

/// <summary>Memory 实现容器溢出时的处理策略。</summary>
public enum OverflowPolicy
{
    /// <summary>直接抛 <see cref="Abstractions.CacheCapacityExceededException"/>。</summary>
    Throw = 0,

    /// <summary>按 FIFO 淘汰最早写入的成员 / 字段。</summary>
    EvictOldest = 1,
}

/// <summary>分布式锁相关配置。</summary>
public sealed class LockOptions
{
    /// <summary>RenewalIntervalRatio 允许上限（0.5）：续租必须留足重试余量，>0.5 极易网络抖动导致锁丢失。</summary>
    public const double MaxRenewalIntervalRatio = 0.5;

    /// <summary>RenewalIntervalRatio 允许下限（0.05）：过短会造成 Redis 过载。</summary>
    public const double MinRenewalIntervalRatio = 0.05;

    /// <summary>Dispose 等待续租循环退出的最长时间（毫秒），超时强制继续 Release。</summary>
    public int DisposeWaitTimeoutMs { get; set; } = 2_000;

    /// <summary>是否为 Redis 锁启用自动续租（heartbeat），避免长任务被 TTL 提前释放。</summary>
    public bool EnableAutoRenewal { get; set; } = true;

    /// <summary>续租间隔相对 TTL 的比例，限定 [0.05, 0.5]，默认 1/3。</summary>
    public double RenewalIntervalRatio { get; set; } = 1.0 / 3.0;
}

/// <summary>Redis 连接选项。</summary>
public sealed class RedisCacheOptions
{
    /// <summary>StackExchange.Redis 连接字符串。</summary>
    public string Configuration { get; set; } = "localhost:6379";

    /// <summary>Redis 数据库编号。</summary>
    public int Database { get; set; } = 0;

    /// <summary>Redis Pub/Sub 失效广播 channel 名；默认 <c>saas:cache:invalidation</c>。</summary>
    public string InvalidationChannel { get; set; } = "saas:cache:invalidation";
}

/// <summary><see cref="CacheOptions"/> 启动期强校验，防止配置静默降级造成隐性 bug。</summary>
internal sealed class CacheOptionsValidator : IValidateOptions<CacheOptions>
{
    public ValidateOptionsResult Validate(string? name, CacheOptions options)
    {
        if (options is null)
            return ValidateOptionsResult.Fail("CacheOptions is null.");

        var errors = new List<string>();

        if (!string.Equals(options.Provider, "Memory", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(options.Provider, "Redis", StringComparison.OrdinalIgnoreCase))
        {
            errors.Add($"Cache:Provider must be 'Memory' or 'Redis' (got '{options.Provider}').");
        }

        if (options.DefaultExpireMinutes < CacheOptions.MinExpireMinutes
            || options.DefaultExpireMinutes > CacheOptions.MaxExpireMinutes)
        {
            errors.Add(
                $"Cache:DefaultExpireMinutes must be in [{CacheOptions.MinExpireMinutes}, {CacheOptions.MaxExpireMinutes}] (got {options.DefaultExpireMinutes}).");
        }

        foreach (var kv in options.ModuleExpireMinutes)
        {
            if (kv.Value < CacheOptions.MinExpireMinutes || kv.Value > CacheOptions.MaxExpireMinutes)
            {
                errors.Add(
                    $"Cache:ModuleExpireMinutes[{kv.Key}] must be in [{CacheOptions.MinExpireMinutes}, {CacheOptions.MaxExpireMinutes}] (got {kv.Value}).");
            }
        }

        if (options.Lock.RenewalIntervalRatio < LockOptions.MinRenewalIntervalRatio
            || options.Lock.RenewalIntervalRatio > LockOptions.MaxRenewalIntervalRatio)
        {
            errors.Add(
                $"Cache:Lock:RenewalIntervalRatio must be in [{LockOptions.MinRenewalIntervalRatio}, {LockOptions.MaxRenewalIntervalRatio}] (got {options.Lock.RenewalIntervalRatio}).");
        }

        if (options.Lock.DisposeWaitTimeoutMs <= 0)
            errors.Add($"Cache:Lock:DisposeWaitTimeoutMs must be > 0 (got {options.Lock.DisposeWaitTimeoutMs}).");

        if (options.Memory.GeoMaxMembersPerKey <= 0)
            errors.Add("Cache:Memory:GeoMaxMembersPerKey must be > 0.");
        if (options.Memory.HashMapMaxFieldsPerKey <= 0)
            errors.Add("Cache:Memory:HashMapMaxFieldsPerKey must be > 0.");

        if (string.Equals(options.Provider, "Redis", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(options.Redis.Configuration))
        {
            errors.Add("Cache:Redis:Configuration is required when Provider=Redis.");
        }

        return errors.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(errors);
    }
}
