using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Caching.Providers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Hosting;

/// <summary>缓存统一注册入口。</summary>
public static class CachingServiceCollectionExtensions
{
    /// <summary>
    /// 注册 <see cref="ICachingService"/>、<see cref="ILockService"/>、<see cref="IGeoService"/>、<see cref="IHashMapService"/>。
    /// 当 <c>Cache:Provider=Redis</c> 时使用 Redis 实现，否则使用 Memory 默认实现。
    /// </summary>
    public static IServiceCollection AddCjoraCaching(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddOptions<CacheOptions>().Bind(configuration.GetSection(CacheOptions.SectionName));
        services.AddMemoryCache();

        var options = configuration.GetSection(CacheOptions.SectionName).Get<CacheOptions>() ?? new CacheOptions();

        if (string.Equals(options.Provider, "Redis", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(options.Redis.Configuration));
            services.AddSingleton<ICachingService, RedisCacheService>();
            services.AddSingleton<ILockService, RedisLockService>();
            services.AddSingleton<IGeoService, RedisGeoService>();
            services.AddSingleton<IHashMapService, RedisHashMapService>();
        }
        else
        {
            services.AddSingleton<ICachingService, MemoryCacheService>();
            services.AddSingleton<ILockService, MemoryLockService>();
            services.AddSingleton<IGeoService, MemoryGeoService>();
            services.AddSingleton<IHashMapService, MemoryHashMapService>();
        }

        return services;
    }
}
