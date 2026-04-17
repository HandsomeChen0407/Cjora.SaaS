using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Caching.Providers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Hosting;

/// <summary>缓存统一注册入口。</summary>
public static class CachingServiceCollectionExtensions
{
    /// <summary>
    /// 注册 <see cref="ICacheManager"/>（推荐业务入口）、<see cref="ICachingService"/>、<see cref="ILockService"/>、
    /// <see cref="IGeoService"/>、<see cref="IHashMapService"/>、<see cref="ICacheInvalidationBus"/>。
    /// </summary>
    /// <remarks>
    /// <para><b>不</b>自动订阅 <see cref="ICacheInvalidationBus"/> 来清理 <see cref="ICachingService"/>：
    /// 当底层是共享 Redis 时那会把刚写入的 key 误删，是数据丢失 bug。
    /// 如果业务层有独立的 L1 缓存，请显式 <c>await _bus.SubscribeAsync(...)</c>。</para>
    /// <para><b>Redis 连接策略：</b>在 <see cref="IOptions{TOptions}"/> 真正被消费（DI 首次解析 <see cref="IConnectionMultiplexer"/>）
    /// 时才调用 <see cref="ConnectionMultiplexer.Connect(ConfigurationOptions,TextWriter?)"/>，并强制
    /// <c>AbortOnConnectFail = false</c>，使 Redis 短暂抖动不至于阻塞应用启动；确实连不上时 Redis 操作会按 StackExchange.Redis
    /// 自身的超时策略返回错误，由业务上层自行降级。</para>
    /// <para><b>配置校验：</b>注册 <see cref="CacheOptionsValidator"/>（<see cref="IValidateOptions{TOptions}"/>），
    /// <see cref="CacheOptions"/> 非法时首次解析会抛 <see cref="OptionsValidationException"/>，杜绝"配置错了但被静默 Clamp"。</para>
    /// </remarks>
    public static IServiceCollection AddCjoraCaching(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services
            .AddOptions<CacheOptions>()
            .Bind(configuration.GetSection(CacheOptions.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<CacheOptions>, CacheOptionsValidator>();
        services.AddMemoryCache();

        // 用配置节的 Provider 决定注册哪组实现（为了避免在 DI 构造阶段触发 IOptions 提前 materialize，这里就地读一次）。
        var provider = configuration.GetSection(CacheOptions.SectionName)["Provider"] ?? "Memory";

        if (string.Equals(provider, "Redis", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IConnectionMultiplexer>(sp =>
            {
                var opts = sp.GetRequiredService<IOptions<CacheOptions>>().Value;
                var cfg = ConfigurationOptions.Parse(opts.Redis.Configuration);
                cfg.AbortOnConnectFail = false;
                return ConnectionMultiplexer.Connect(cfg);
            });
            services.AddSingleton<ICachingService, RedisCacheService>();
            services.AddSingleton<ILockService, RedisLockService>();
            services.AddSingleton<IGeoService, RedisGeoService>();
            services.AddSingleton<IHashMapService, RedisHashMapService>();
            services.AddSingleton<ICacheInvalidationBus, RedisCacheInvalidationBus>();
        }
        else
        {
            services.AddSingleton<ICachingService, MemoryCacheService>();
            services.AddSingleton<ILockService, MemoryLockService>();
            services.AddSingleton<IGeoService, MemoryGeoService>();
            services.AddSingleton<IHashMapService, MemoryHashMapService>();
            services.AddSingleton<ICacheInvalidationBus, MemoryCacheInvalidationBus>();
        }

        services.AddSingleton<ICacheManager, CacheManager>();

        return services;
    }
}
