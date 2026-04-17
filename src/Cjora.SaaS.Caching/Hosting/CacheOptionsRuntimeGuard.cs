using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Hosting;

/// <summary>
/// 监听 <see cref="CacheOptions"/> 的运行期变更，对<b>不可安全热更</b>的字段发出警告。
/// </summary>
/// <remarks>
/// <para><b>为什么需要：</b><see cref="CacheOptions.KeyPrefix"/> 在运行期被改会造成"新前缀读不到旧前缀已写入的数据"
/// = 事实上的全表失效；<see cref="RedisCacheOptions.InvalidationChannel"/> 被改会造成订阅方 / 发布方 channel 脱钩。
/// 这些改动本身不会报错，但线上表现是缓存命中率暴跌 + 外部 L1 永远 stale，非常难排查。此守卫在 configmap 热更的瞬间
/// 通过 <c>LogWarning</c> 让运维能第一时间看到，并建议滚动重启。</para>
/// </remarks>
internal sealed class CacheOptionsRuntimeGuard : IHostedService, IDisposable
{
    private readonly IOptionsMonitor<CacheOptions> _monitor;
    private readonly ILogger<CacheOptionsRuntimeGuard> _logger;
    private IDisposable? _subscription;
    private string _lastKeyPrefix = string.Empty;
    private string _lastProvider = string.Empty;
    private string _lastRedisConfig = string.Empty;

    public CacheOptionsRuntimeGuard(
        IOptionsMonitor<CacheOptions> monitor,
        ILogger<CacheOptionsRuntimeGuard> logger)
    {
        _monitor = monitor;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var current = _monitor.CurrentValue;
        _lastKeyPrefix = current.KeyPrefix ?? string.Empty;
        _lastProvider = current.Provider ?? string.Empty;
        _lastRedisConfig = current.Redis.Configuration ?? string.Empty;

        _subscription = _monitor.OnChange(OnOptionsChanged);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void OnOptionsChanged(CacheOptions opts)
    {
        var keyPrefix = opts.KeyPrefix ?? string.Empty;
        if (!string.Equals(_lastKeyPrefix, keyPrefix, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "Cache:KeyPrefix changed at runtime from '{Old}' to '{New}'. "
                + "Already-written cache keys carry the OLD prefix and will become unreachable under the NEW prefix "
                + "(effectively cache-wide miss storm). Perform a rolling restart to stabilize.",
                _lastKeyPrefix, keyPrefix);
            _lastKeyPrefix = keyPrefix;
        }

        if (!string.Equals(_lastProvider, opts.Provider, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Cache:Provider changed at runtime from '{Old}' to '{New}'. "
                + "Provider switch is NOT supported at runtime; restart required.",
                _lastProvider, opts.Provider);
            _lastProvider = opts.Provider ?? string.Empty;
        }

        var redisConfig = opts.Redis.Configuration ?? string.Empty;
        if (!string.Equals(_lastRedisConfig, redisConfig, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "Cache:Redis:Configuration changed at runtime. Existing ConnectionMultiplexer will NOT rebind; restart required.");
            _lastRedisConfig = redisConfig;
        }
    }

    public void Dispose() => _subscription?.Dispose();
}
